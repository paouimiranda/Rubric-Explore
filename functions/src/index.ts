import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from "cors";
import express from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import nodemailer from "nodemailer";

const pdfParse = require('pdf-parse');


admin.initializeApp();
const db = admin.firestore();

// ========================================
// INTERFACES FOR QUIZ GENERATION
// ========================================

interface QuizGenerationRequest {
  topic: string;
  num_questions: number;
  content?: string;
  question_types?: string[];
}

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'matching';
  question: string;
  image?: string;
  options: string[];
  correctAnswers: number[];
  timeLimit: number;
  matchPairs: Array<{ left: string; right: string }>;
  correctAnswer: string;
  topic: string;
  points?: number;
}

// ========================================
// SHARED GEMINI API INITIALIZATION
// ========================================

/**
 * Get Gemini API Key from environment
 * Tries process.env first, then falls back to Firebase config
 */
function getGeminiApiKey(): string {
  // Try environment variable first (used by Cloud Functions v1)
  let apiKey = process.env.GEMINI_API_KEY;
  
  // Fallback to Firebase config (if using firebase functions:config:set)
  if (!apiKey) {
    try {
      apiKey = functions.config().gemini?.api_key;
    } catch (e) {
      // Config might not be available in all environments
    }
  }
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable or use firebase functions:config:set gemini.api_key="your-key"');
  }
  
  return apiKey;
}

// ========================================
// QUIZ GENERATION HELPER FUNCTIONS
// ========================================

/**
 * Generate Multiple Choice Questions
 */
async function generateMultipleChoiceQuestions(
  genAI: GoogleGenerativeAI,
  content: string,
  numQuestions: number,
  topic: string
): Promise<QuizQuestion[]> {
  console.log(`\n=== Generating ${numQuestions} Multiple Choice Questions ===`);
  console.log(`Content length: ${content.length}`);
  console.log(`Content preview: ${content.slice(0, 200)}`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a quiz generator. Create multiple choice questions with EXACTLY 4 choices.
Use this EXACT format for each question:

Question: <question text>
A) <choice A>
B) <choice B>
C) <choice C>
D) <choice D>
Answer: <letter(s)>
Topic: <specific topic category>

IMPORTANT: 
- Use 'A)' format with parenthesis, not 'A.' with period.
- Always include 'Answer:' line with the correct letter(s).
- REQUIRED: Add a 'Topic:' line with a specific category for analytics (e.g., "Variables", "Allied Powers", "Photosynthesis").
- The topic should be a concise, specific category (2-4 words max) that describes what the question tests.
- If content is provided, analyze it and assign relevant topic categories based on the subject matter.
- If no content is provided, generate diverse topic categories within the main subject.

Generate EXACTLY ${numQuestions} multiple choice questions about: ${content}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const quizText = response.text();

  console.log('\n=== AI Response ===');
  console.log(quizText);
  console.log('='.repeat(50));

  const questions: QuizQuestion[] = [];
  
  // Split by double newlines or "Question:" markers
  const questionBlocks = quizText.trim().split(/\n\s*\n|(?=Question\s*\d*:)/);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    if (!block.trim()) continue;

    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 6) continue; // Need question + 4 options + answer

    // Extract question
    let questionText = '';
    for (const line of lines) {
      if (/^question\s*\d*[:.]\s*/i.test(line) || 
          (!questionText && !line.startsWith('A') && !line.startsWith('B') && 
           !line.startsWith('C') && !line.startsWith('D') && !line.startsWith('Answer') && !line.startsWith('Topic'))) {
        questionText = line.replace(/^question\s*\d*[:.]\s*/i, '');
        break;
      }
    }

    if (!questionText) continue;

    // Extract options
    const options: string[] = [];
    const correctAnswers: number[] = [];
    let questionTopic = topic; // Default to main topic

    for (const line of lines) {
      // Match A), A., A:, etc.
      const match = line.match(/^([A-D])[\).\:]\s*(.+)$/);
      if (match) {
        const letter = match[1];
        const text = match[2].trim();

        if (letter === 'A') {
          options.length = 0; // Start fresh
          options.push(text);
        } else if (letter === 'B' && options.length === 1) {
          options.push(text);
        } else if (letter === 'C' && options.length === 2) {
          options.push(text);
        } else if (letter === 'D' && options.length === 3) {
          options.push(text);
        }
      }

      // Extract answer
      if (/^(correct\s*)?answer[s]?[:\s]/i.test(line)) {
        const answerPart = line.replace(/^(correct\s*)?answer[s]?[:\s]+/i, '').toUpperCase();
        ['A', 'B', 'C', 'D'].forEach((letter) => {
          if (answerPart.includes(letter)) {
            correctAnswers.push(letter.charCodeAt(0) - 'A'.charCodeAt(0));
          }
        });
      }

      // Extract topic
      if (/^topic[:\s]/i.test(line)) {
        const extractedTopic = line.replace(/^topic[:\s]+/i, '').trim();
        if (extractedTopic) {
          questionTopic = extractedTopic;
        }
      }
    }

    if (options.length === 4 && correctAnswers.length > 0) {
      questions.push({
        id: `mc_${i + 1}_${Date.now()}`,
        type: 'multiple_choice',
        question: questionText,
        image: '',
        options,
        correctAnswers,
        timeLimit: 30,
        matchPairs: [],
        correctAnswer: '',
        topic: questionTopic,
        points: 1
      });
      console.log(`✅ Parsed question ${i + 1}: ${questionText.slice(0, 50)}... | Topic: ${questionTopic}`);
    } else {
      console.log(`⚠️ Failed to parse question block ${i + 1}: options=${options.length}, answers=${correctAnswers.length}`);
    }
  }

  console.log(`\n✅ Successfully generated ${questions.length} multiple choice questions`);
  return questions;
}

/**
 * Generate Fill in the Blank Questions
 */
async function generateFillBlankQuestions(
  genAI: GoogleGenerativeAI,
  content: string,
  numQuestions: number,
  topic: string
): Promise<QuizQuestion[]> {
  console.log(`\n=== Generating ${numQuestions} Fill Blank Questions ===`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a quiz generator. Create fill-in-the-blank questions.
Use this EXACT format for each question:

Question: <sentence with _____ for the blank>
Answer: <correct word or phrase>
Topic: <specific topic category>

IMPORTANT:
- Use 5 underscores (_____ ) to indicate the blank.
- Keep answers concise (1-3 words).
- REQUIRED: Add a 'Topic:' line with a specific category for analytics (e.g., "Variables", "Vocabulary", "Dates").
- The topic should be a concise, specific category (2-4 words max) that describes what the question tests.
- If content is provided, analyze it and assign relevant topic categories based on the subject matter.
- If no content is provided, generate diverse topic categories within the main subject.

Generate EXACTLY ${numQuestions} fill-in-the-blank questions about: ${content}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const quizText = response.text();

  console.log('\n=== AI Response ===');
  console.log(quizText);
  console.log('='.repeat(50));

  const questions: QuizQuestion[] = [];
  const questionBlocks = quizText.trim().split(/\n\s*\n|(?=Question\s*\d*:)/);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    if (!block.trim()) continue;

    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) continue;

    let questionText = '';
    let correctAnswer = '';
    let questionTopic = topic; // Default to main topic

    for (const line of lines) {
      if (/^question\s*\d*[:.]\s*/i.test(line)) {
        questionText = line.replace(/^question\s*\d*[:.]\s*/i, '');
      } else if (/^(correct\s*)?answer[s]?[:\s]/i.test(line)) {
        correctAnswer = line.replace(/^(correct\s*)?answer[s]?[:\s]+/i, '').trim();
      } else if (/^topic[:\s]/i.test(line)) {
        const extractedTopic = line.replace(/^topic[:\s]+/i, '').trim();
        if (extractedTopic) {
          questionTopic = extractedTopic;
        }
      }
    }

    if (questionText && correctAnswer && questionText.includes('_')) {
      questions.push({
        id: `fb_${i + 1}_${Date.now()}`,
        type: 'fill_blank',
        question: questionText,
        image: '',
        options: [],
        correctAnswers: [],
        timeLimit: 30,
        matchPairs: [],
        correctAnswer,
        topic: questionTopic,
        points: 1
      });
      console.log(`✅ Parsed question ${i + 1}: ${questionText.slice(0, 50)}... | Topic: ${questionTopic}`);
    } else {
      console.log(`⚠️ Failed to parse question block ${i + 1}`);
    }
  }

  console.log(`\n✅ Successfully generated ${questions.length} fill blank questions`);
  return questions;
}

/**
 * Generate Matching Questions
 */
async function generateMatchingQuestions(
  genAI: GoogleGenerativeAI,
  content: string,
  numQuestions: number,
  topic: string
): Promise<QuizQuestion[]> {
  console.log(`\n=== Generating ${numQuestions} Matching Questions ===`);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a quiz generator. Create matching questions with 4-6 pairs.
Use this EXACT format:

Question: Match the following items
1. <left item 1> -> <right item 1>
2. <left item 2> -> <right item 2>
3. <left item 3> -> <right item 3>
(etc.)
Topic: <specific topic category>

IMPORTANT:
- Each pair should be numbered. Use ' -> ' to separate left and right items.
- REQUIRED: Add a 'Topic:' line with a specific category for analytics (e.g., "Key Terms", "Historical Figures", "Functions").
- The topic should be a concise, specific category (2-4 words max) that describes what the question tests.
- If content is provided, analyze it and assign relevant topic categories based on the subject matter.
- If no content is provided, generate diverse topic categories within the main subject.

Generate ${numQuestions} matching question(s) about: ${content}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const quizText = response.text();

  console.log('\n=== AI Response ===');
  console.log(quizText);
  console.log('='.repeat(50));

  const questions: QuizQuestion[] = [];
  const questionBlocks = quizText.trim().split(/\n\s*\n|(?=Question\s*\d*:)/);

  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i];
    if (!block.trim()) continue;

    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 4) continue;

    let questionText = 'Match the following items';
    const matchPairs: Array<{ left: string; right: string }> = [];
    let questionTopic = topic; // Default to main topic

    for (const line of lines) {
      if (/^question\s*\d*[:.]\s*/i.test(line)) {
        questionText = line.replace(/^question\s*\d*[:.]\s*/i, '');
      } else if (/^topic[:\s]/i.test(line)) {
        const extractedTopic = line.replace(/^topic[:\s]+/i, '').trim();
        if (extractedTopic) {
          questionTopic = extractedTopic;
        }
      } else if (line.includes('->') || line.includes('→')) {
        // Parse pair (handle both -> and →)
        const separator = line.includes('->') ? '->' : '→';
        const parts = line.split(separator, 2);
        
        if (parts.length === 2) {
          let left = parts[0].trim();
          const right = parts[1].trim();
          
          // Remove leading numbers/bullets
          left = left.replace(/^\d+[\).\:]\s*/, '');
          
          matchPairs.push({ left, right });
        }
      }
    }

    if (matchPairs.length >= 3) {
      questions.push({
        id: `match_${i + 1}_${Date.now()}`,
        type: 'matching',
        question: questionText,
        image: '',
        options: [],
        correctAnswers: [],
        timeLimit: 45,
        matchPairs,
        correctAnswer: '',
        topic: questionTopic,
        points: 1
      });
      console.log(`✅ Parsed question ${i + 1} with ${matchPairs.length} pairs | Topic: ${questionTopic}`);
    } else {
      console.log(`⚠️ Failed to parse question block ${i + 1}: only ${matchPairs.length} pairs`);
    }
  }

  console.log(`\n✅ Successfully generated ${questions.length} matching questions`);
  return questions;
}

// ========================================
// FIREBASE CALLABLE FUNCTION: GENERATE QUIZ
// ========================================

/**
 * Main Firebase Function - Generate Quiz
 */
export const generateQuiz = functions.https.onCall(async (request) => {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 NEW QUIZ REQUEST');
  console.log('='.repeat(60));
  
  // Optional: Require authentication
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate quizzes'
    );
  }

  const data = request.data as QuizGenerationRequest;
  const { topic, num_questions, content, question_types = ['multiple_choice'] } = data;

  console.log(`Topic: ${topic}`);
  console.log(`Num Questions: ${num_questions}`);
  console.log(`Content provided: ${!!content}`);
  console.log(`Content length: ${content?.length || 0}`);
  console.log(`Question types: ${question_types}`);

  // Validation
  if (num_questions < 1 || num_questions > 20) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Number of questions must be between 1 and 20'
    );
  }

  // Use provided content or topic
  const sourceContent = content || topic;

  if (!sourceContent || sourceContent.trim().length === 0) {
    console.log('❌ ERROR: No content or topic provided');
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Either topic or content must be provided'
    );
  }

  try {
    // Initialize Gemini API using shared function
    const apiKey = getGeminiApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    const allQuestions: QuizQuestion[] = [];

    // If only one type requested, generate all questions of that type
    if (question_types.length === 1) {
      const questionType = question_types[0];
      console.log(`\n📝 Generating ${num_questions} questions of type: ${questionType}`);

      if (questionType === 'multiple_choice') {
        const questions = await generateMultipleChoiceQuestions(genAI, sourceContent, num_questions, topic);
        allQuestions.push(...questions);
      } else if (questionType === 'fill_blank') {
        const questions = await generateFillBlankQuestions(genAI, sourceContent, num_questions, topic);
        allQuestions.push(...questions);
      } else if (questionType === 'matching') {
        const questions = await generateMatchingQuestions(genAI, sourceContent, num_questions, topic);
        allQuestions.push(...questions);
      }
    } else {
      // Distribute questions across types
      const questionsPerType = Math.max(1, Math.floor(num_questions / question_types.length));
      const remaining = num_questions % question_types.length;

      for (let idx = 0; idx < question_types.length; idx++) {
        const qType = question_types[idx];
        const count = questionsPerType + (idx < remaining ? 1 : 0);
        console.log(`\n📝 Generating ${count} questions of type: ${qType}`);

        if (qType === 'multiple_choice') {
          const questions = await generateMultipleChoiceQuestions(genAI, sourceContent, count, topic);
          allQuestions.push(...questions);
        } else if (qType === 'fill_blank') {
          const questions = await generateFillBlankQuestions(genAI, sourceContent, count, topic);
          allQuestions.push(...questions);
        } else if (qType === 'matching') {
          const questions = await generateMatchingQuestions(genAI, sourceContent, count, topic);
          allQuestions.push(...questions);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ TOTAL QUESTIONS GENERATED: ${allQuestions.length}`);
    console.log('='.repeat(60) + '\n');

    return {
      quiz: allQuestions,
      success: true
    };

  } catch (error: any) {
    console.error('\n❌ ERROR generating quiz:', error);
    console.error(error.stack);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate quiz: ${error.message}`
    );
  }
});

// ========================================
// EXPRESS APP FOR EMAIL & OCR ENDPOINTS
// ========================================

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 🔐 Configure Gmail (App Password)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rubric.capstone@gmail.com",
    pass: "vdpdgqjkfswywqcf",
  },
});

// 📨 SEND OTP (for password reset)
app.post("/sendOtp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Missing email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection("otp_codes").doc(email).set({
      otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: email,
      subject: "OTP for Changing Your Password",
      text: `Your OTP for changing your Rubric account password is ${otp}. It expires in 5 minutes.`,
    });

    res.status(200).send({ success: true, message: "OTP sent successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
  return null;
});

// ✅ VERIFY OTP (for password reset)
app.post("/verifyOtp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).send({ error: "Missing fields" });
    }

    const doc = await db.collection("otp_codes").doc(email).get();
    if (!doc.exists) return res.status(400).send({ error: "OTP not found" });

    const data = doc.data();
    if (data?.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
    if (Date.now() > data!.expiresAt)
      return res.status(400).send({ error: "OTP expired" });

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });

    await db.collection("otp_codes").doc(email).delete();

    res.status(200).send({ success: true, message: "Password reset successful" });
  } catch (err: any) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
  return null;
});

// ✅ Change Password (manual)
app.post("/changePassword", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ error: "Missing email or new password" });

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Failed to update password" });
  }
});

// ✅ Send Verification Link (general)
app.post("/sendVerificationLink", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send({ error: "Missing email" });

    const user = await admin.auth().getUserByEmail(email);
    if (!user) return res.status(404).send({ error: "User not found" });

    const actionCodeSettings = {
      url: "https://rubric-app-8f65c.web.app/emailVerified",
      handleCodeInApp: true,
    };

    const link = await admin.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: email,
      subject: "Verify your email address",
      html: `
        <p>Hello,</p>
        <p>Click the button below to verify your email address:</p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#5a3dff;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
        <p>If you see this email you can login into the app</p>
      `,
    });

    return res
      .status(200)
      .send({ success: true, message: "Verification email sent" });
  } catch (error: any) {
    console.error(error);
    return res.status(500).send({ error: error.message });
  }
});

// ✅ STEP 1: Send OTP for Change Email (no `newEmail` required)
app.post("/sendChangeEmailOtp", async (req, res) => {
  try {
    const { currentEmail } = req.body;
    if (!currentEmail) return res.status(400).send({ error: "Missing current email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.collection("email_change_requests").doc(currentEmail).set({
      otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: currentEmail,
      subject: "OTP for Changing Your Email",
      text: `Your OTP for changing your Rubric account email is ${otp}. It expires in 5 minutes.`,
    });

    return res.status(200).send({ success: true, message: "OTP sent successfully" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).send({ error: err.message });
  }
});

// ✅ STEP 2: Verify OTP & optionally send verification link to new email
app.post("/verifyChangeEmailOtp", async (req, res) => {
  try {
    const { currentEmail, otp, newEmail } = req.body;
    if (!currentEmail || !otp)
      return res.status(400).send({ error: "Missing email or OTP" });

    const doc = await db.collection("email_change_requests").doc(currentEmail).get();
    if (!doc.exists) return res.status(404).send({ error: "OTP not found" });

    const data = doc.data();
    if (data?.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
    if (Date.now() > data!.expiresAt)
      return res.status(400).send({ error: "OTP expired" });

    // ✅ Step 2A: If no newEmail → just confirm OTP
    if (!newEmail) {
      return res.status(200).send({ success: true, message: "OTP verified" });
    }

    // ✅ Step 2B: If newEmail provided → send verification link
    const existingUsers = await admin.auth().listUsers(1000);
    const emailExists = existingUsers.users.some((u) => u.email === newEmail);
    if (emailExists)
      return res.status(400).send({ error: "Email already in use." });

    const link = `https://api-m2tvqc6zqq-uc.a.run.app/verifyNewEmail?old=${encodeURIComponent(currentEmail)}&new=${encodeURIComponent(newEmail)}`;

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: newEmail,
      subject: "Verify your new email address",
      html: `
        <p>Hello,</p>
        <p>You requested to change your Rubric account email.</p>
        <p>Click below to verify your new email:</p>
        <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#5a3dff;color:white;text-decoration:none;border-radius:5px;">Verify New Email</a>
      `,
    });

    return res.status(200).send({
      success: true,
      message: "Verification link sent to new email",
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).send({ error: err.message });
  }
});

// ✅ FINAL STEP: Handle the link verification
app.get("/verifyNewEmail", async (req, res) => {
  try {
    const oldEmail = req.query.old as string;
    const newEmail = req.query.new as string;

    if (!oldEmail || !newEmail)
      return res.status(400).send("Missing parameters.");

    const user = await admin.auth().getUserByEmail(oldEmail);
    await admin.auth().updateUser(user.uid, { email: newEmail });

    await db.collection("email_change_requests").doc(oldEmail).delete();

    return res.redirect("https://rubric-app-8f65c.web.app/new-email-verified");
  } catch (err: any) {
    console.error(err);
    return res.status(500).send("Failed to verify new email.");
  }
});

app.get("/debugUsers", async (req, res) => {
  const list = await admin.auth().listUsers(10);
  const emails = list.users.map(u => u.email);
  res.send(emails);
});

// ✨ Gemini OCR Endpoint - Now uses shared API key function
app.post("/extractTextFromImage", async (req, res) => {
  try {
    console.log('🔍 extractTextFromImage called');
    const { base64Image, mimeType } = req.body;

    if (!base64Image) {
      console.error('❌ No base64Image provided');
      return res.status(400).send({ error: 'Image data is required' });
    }

    // Use shared API key function
    const apiKey = getGeminiApiKey();

    console.log('✅ Initializing Gemini AI');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = 'Extract all the text from this image. Return only the text content, preserving line breaks and formatting where possible. If the text is handwritten, do your best to transcribe it accurately.';

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType || 'image/jpeg',
      },
    };

    console.log('✅ Calling Gemini API');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    console.log('✅ Text extracted successfully, length:', text.length);

    const wordCount = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;

    return res.status(200).send({
      success: true,
      text,
      wordCount,
    });
  } catch (error: any) {
    console.error('❌ Error in extractTextFromImage:', error);
    return res.status(500).send({ 
      error: error.message || 'Failed to extract text from image' 
    });
  }
});

// ✅ Send Email Verification (called during registration)
app.post("/sendEmailVerification", async (req, res) => {
  try {
    const { email, uid } = req.body;
    if (!email || !uid) return res.status(400).send({ error: "Missing email or uid" });

    // Generate a verification token (store in Firestore)
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
    
    await db.collection("email_verifications").doc(uid).set({
      email,
      token: verificationToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      verified: false,
    });

    const verificationLink = `https://api-m2tvqc6zqq-uc.a.run.app/verifyEmail?token=${verificationToken}&uid=${uid}`;

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: email,
      subject: "Verify Your Email Address - Rubric",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A2D4B;">Welcome to Rubric!</h2>
          <p>Thank you for registering. Please verify your email address to activate your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="display:inline-block;
                      padding:15px 30px;
                      background: linear-gradient(to right, #52F7E2, #5EEF96);
                      color:#263A56;
                      text-decoration:none;
                      border-radius:8px;
                      font-weight:bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #1A2D4B;">${verificationLink}</span>
          </p>
        </div>
      `,
    });

    return res.status(200).send({ 
      success: true, 
      message: "Verification email sent successfully" 
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return res.status(500).send({ error: error.message });
  }
});

// ✅ Handle Email Verification (when user clicks link)
app.get("/verifyEmail", async (req, res) => {
  try {
    const { token, uid } = req.query;

    if (!token || !uid) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">Invalid Verification Link</h2>
            <p>The verification link is missing required parameters.</p>
          </body>
        </html>
      `);
    }

    // Get verification record
    const verificationDoc = await db.collection("email_verifications").doc(uid as string).get();
    
    if (!verificationDoc.exists) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">Verification Not Found</h2>
            <p>This verification link is invalid or has already been used.</p>
          </body>
        </html>
      `);
    }

    const verificationData = verificationDoc.data();
    
    // Check if already verified
    if (verificationData?.verified) {
      return res.redirect("https://rubric-app-8f65c.web.app/already-verified");
    }

    // Check if token matches
    if (verificationData?.token !== token) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">Invalid Token</h2>
            <p>The verification token is incorrect.</p>
          </body>
        </html>
      `);
    }

    // Check if expired
    if (Date.now() > verificationData?.expiresAt) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: #ef4444;">Link Expired</h2>
            <p>This verification link has expired. Please request a new one.</p>
          </body>
        </html>
      `);
    }

    // Update user's isVerified field
    await db.collection("users").doc(uid as string).update({
      isVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark verification as complete
    await db.collection("email_verifications").doc(uid as string).update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Redirect to success page (you can customize this)
    return res.redirect("https://rubric-app-8f65c.web.app/email-verified");
  } catch (error: any) {
    console.error("Error verifying email:", error);
    return res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">Verification Failed</h2>
          <p>An error occurred while verifying your email. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

// Resend Verification Email
app.post("/resendVerificationEmail", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).send({ error: "Missing uid" });

    // Get user data
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).send({ error: "User not found" });
    }

    const userData = userDoc.data();
    if (userData?.isVerified) {
      return res.status(400).send({ error: "Email already verified" });
    }

    // Check if verification exists and is recent (prevent spam)
    const verificationDoc = await db.collection("email_verifications").doc(uid).get();
    if (verificationDoc.exists) {
      const verificationData = verificationDoc.data();
      const timeSinceCreation = Date.now() - verificationData?.createdAt?.toMillis();
      
      // Prevent resending within 1 minute
      if (timeSinceCreation < 60000) {
        return res.status(429).send({ 
          error: "Please wait before requesting another verification email" 
        });
      }
    }

    // Generate new token and send email
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
    
    await db.collection("email_verifications").doc(uid).set({
      email: userData?.email,
      token: verificationToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      verified: false,
    });

    const verificationLink = `https://api-m2tvqc6zqq-uc.a.run.app/verifyEmail?token=${verificationToken}&uid=${uid}`;

    await transporter.sendMail({
      from: '"Rubric" <rubric.capstone@gmail.com>',
      to: userData?.email,
      subject: "Verify Your Email Address - Rubric",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A2D4B;">Verify Your Email</h2>
          <p>You requested a new verification link for your Rubric account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="display:inline-block;
                      padding:15px 30px;
                      background: linear-gradient(to right, #52F7E2, #5EEF96);
                      color:#263A56;
                      text-decoration:none;
                      border-radius:8px;
                      font-weight:bold;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    });

    return res.status(200).send({ 
      success: true, 
      message: "Verification email sent successfully" 
    });
  } catch (error: any) {
    console.error("Error resending verification email:", error);
    return res.status(500).send({ error: error.message });
  }
});

// ========================================
// 🆕 NEW: PDF TEXT EXTRACTION FUNCTION
// ========================================

/**
 * Cloud Function to extract text from PDF
 * Called from the mobile app with PDF file data
 */
export const extractPDFText = onCall(
  {
    timeoutSeconds: 300, // 5 minutes for large PDFs
    memory: '1GiB', // More memory for PDF processing
    cors: true,
  },
  async (request) => {
    console.log('\n' + '='.repeat(60));
    console.log('📄 NEW PDF EXTRACTION REQUEST');
    console.log('='.repeat(60));

    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to extract PDF text'
      );
    }

    const { base64Data, fileName } = request.data;

    if (!base64Data) {
      throw new HttpsError(
        'invalid-argument',
        'PDF data is required'
      );
    }

    try {
      console.log(`Processing PDF: ${fileName || 'unnamed'}`);
      console.log(`User: ${request.auth.uid}`);

      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const sizeInMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
      console.log(`PDF size: ${sizeInMB} MB`);

      // Check size limit (10MB for callable functions)
      if (pdfBuffer.length > 10 * 1024 * 1024) {
        throw new HttpsError(
          'invalid-argument',
          'PDF file too large. Maximum size is 10MB.'
        );
      }

      // Extract text from PDF
      console.log('Extracting text from PDF...');
      const pdfData = await pdfParse(pdfBuffer, {
        max: 0, // Extract all pages
      });

      // Clean up the extracted text
      let text = pdfData.text;
      
      // Remove excessive whitespace
      text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
      text = text.replace(/[ \t]+/g, ' ');
      text = text.trim();

      // Convert plain text to basic HTML paragraphs
      const htmlContent = text
        .split('\n\n')
        .map((paragraph: string) => {
          if (paragraph.trim()) {
            return `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`;
          }
          return '';
        })
        .filter((p: string) => p)
        .join('\n');

      const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;

      console.log(`✅ Successfully extracted ${text.length} characters from PDF`);
      console.log(`Pages: ${pdfData.numpages}, Words: ${wordCount}`);

      // Log to Firestore for analytics (optional)
      await db.collection('pdf_extractions').add({
        userId: request.auth.uid,
        fileName: fileName || 'unknown',
        pages: pdfData.numpages,
        characterCount: text.length,
        wordCount: wordCount,
        sizeBytes: pdfBuffer.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        text: text,
        htmlContent: htmlContent,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
          characterCount: text.length,
          wordCount: wordCount,
        }
      };

    } catch (error: any) {
      console.error('❌ Error extracting PDF text:', error);
      
      // Don't expose internal errors to client
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        'internal',
        'Failed to extract text from PDF. The file might be corrupted or image-based.'
      );
    }
  }
);

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ========================================
// EXPORT THE EXPRESS API (v1 function)
// ========================================
export const api = functions.https.onRequest(app);
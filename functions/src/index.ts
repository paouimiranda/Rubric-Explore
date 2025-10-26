// import cors from "cors";
// import express from "express";
// import * as admin from "firebase-admin";
// import * as functions from "firebase-functions";
// import nodemailer from "nodemailer";

// admin.initializeApp();
// const db = admin.firestore();

// // ⚙️ Setup Express app
// const app = express();
// app.use(cors({ origin: true }));
// app.use(express.json());

// // 🔐 Configure Gmail (App Password)
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "rubric.capstone@gmail.com",
//     pass: "vdpdgqjkfswywqcf",
//   },
// });

// // 📨 SEND OTP (for password reset)
// app.post("/sendOtp", async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).send({ error: "Missing email" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     await db.collection("otp_codes").doc(email).set({
//       otp,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       expiresAt: Date.now() + 5 * 60 * 1000,
//     });

//     await transporter.sendMail({
//       from: '"Rubric" <rubric.capstone@gmail.com>',
//       to: email,
//       subject: "One Time Password",
//       text: `Your OTP code is ${otp}. It expires in 5 minutes.`,
//     });

//     res.status(200).send({ success: true, message: "OTP sent successfully" });
//   } catch (err: any) {
//     console.error(err);
//     res.status(500).send({ error: err.message });
//   }
//   return null;
// });

// // ✅ VERIFY OTP (for password reset)
// app.post("/verifyOtp", async (req, res) => {
//   try {
//     const { email, otp, newPassword } = req.body;
//     if (!email || !otp || !newPassword) {
//       return res.status(400).send({ error: "Missing fields" });
//     }

//     const doc = await db.collection("otp_codes").doc(email).get();
//     if (!doc.exists) return res.status(400).send({ error: "OTP not found" });

//     const data = doc.data();
//     if (data?.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
//     if (Date.now() > data!.expiresAt)
//       return res.status(400).send({ error: "OTP expired" });

//     const user = await admin.auth().getUserByEmail(email);
//     await admin.auth().updateUser(user.uid, { password: newPassword });

//     await db.collection("otp_codes").doc(email).delete();

//     res.status(200).send({ success: true, message: "Password reset successful" });
//   } catch (err: any) {
//     console.error(err);
//     res.status(500).send({ error: err.message });
//   }
//   return null;
// });

// // ✅ Change Password (manual)
// app.post("/changePassword", async (req, res) => {
//   const { email, newPassword } = req.body;
//   if (!email || !newPassword)
//     return res.status(400).json({ error: "Missing email or new password" });

//   try {
//     const user = await admin.auth().getUserByEmail(email);
//     await admin.auth().updateUser(user.uid, { password: newPassword });
//     return res.status(200).json({
//       success: true,
//       message: "Password updated successfully",
//     });
//   } catch (error) {
//     console.error("Error updating password:", error);
//     return res.status(500).json({ error: "Failed to update password" });
//   }
// });

// // ✅ Send Verification Link (general)
// app.post("/sendVerificationLink", async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).send({ error: "Missing email" });

//     const user = await admin.auth().getUserByEmail(email);
//     if (!user) return res.status(404).send({ error: "User not found" });

//     const actionCodeSettings = {
//       url: "https://rubric-app-8f65c.web.app/emailVerified",
//       handleCodeInApp: true,
//     };

//     const link = await admin.auth().generateEmailVerificationLink(
//       email,
//       actionCodeSettings
//     );

//     await transporter.sendMail({
//       from: '"App Support" <rubric.capstone@gmail.com>',
//       to: email,
//       subject: "Verify your email address",
//       html: `
//         <p>Hello,</p>
//         <p>Click the button below to verify your email address:</p>
//         <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#5a3dff;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
//       `,
//     });

//     return res
//       .status(200)
//       .send({ success: true, message: "Verification email sent" });
//   } catch (error: any) {
//     console.error(error);
//     return res.status(500).send({ error: error.message });
//   }
// });


// // ✅ STEP 1: Send OTP for Change Email (no `newEmail` required)
// app.post("/sendChangeEmailOtp", async (req, res) => {
//   try {
//     const { currentEmail } = req.body;
//     if (!currentEmail) return res.status(400).send({ error: "Missing current email" });

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     await db.collection("email_change_requests").doc(currentEmail).set({
//       otp,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       expiresAt: Date.now() + 5 * 60 * 1000,
//     });

//     await transporter.sendMail({
//       from: '"Rubric" <rubric.capstone@gmail.com>',
//       to: currentEmail,
//       subject: "OTP for Changing Your Email",
//       text: `Your OTP for changing your Rubric account email is ${otp}. It expires in 5 minutes.`,
//     });

//     return res.status(200).send({ success: true, message: "OTP sent successfully" });
//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).send({ error: err.message });
//   }
// });


// // ✅ STEP 2: Verify OTP & optionally send verification link to new email
// app.post("/verifyChangeEmailOtp", async (req, res) => {
//   try {
//     const { currentEmail, otp, newEmail } = req.body;
//     if (!currentEmail || !otp)
//       return res.status(400).send({ error: "Missing email or OTP" });

//     const doc = await db.collection("email_change_requests").doc(currentEmail).get();
//     if (!doc.exists) return res.status(404).send({ error: "OTP not found" });

//     const data = doc.data();
//     if (data?.otp !== otp) return res.status(400).send({ error: "Invalid OTP" });
//     if (Date.now() > data!.expiresAt)
//       return res.status(400).send({ error: "OTP expired" });

//     // ✅ Step 2A: If no newEmail → just confirm OTP
//     if (!newEmail) {
//       return res.status(200).send({ success: true, message: "OTP verified" });
//     }

//     // ✅ Step 2B: If newEmail provided → send verification link
//     const existingUsers = await admin.auth().listUsers(1000);
//     const emailExists = existingUsers.users.some((u) => u.email === newEmail);
//     if (emailExists)
//       return res.status(400).send({ error: "Email already in use." });

//     // ✅ Instead of Firebase's verification link, generate your own frontend link
//     const link = `https://api-m2tvqc6zqq-uc.a.run.app/verifyNewEmail?old=${encodeURIComponent(currentEmail)}&new=${encodeURIComponent(newEmail)}`;


//     // // Send the verification email manually
//     // await transporter.sendMail({
//     //   from: '"Rubric" <rubric.capstone@gmail.com>',
//     //   to: newEmail,
//     //   subject: "Verify your new email address",
//     //   html: `
//     //     <p>Hello,</p>
//     //     <p>You requested to change your Rubric account email.</p>
//     //     <p>Click below to verify your new email:</p>
//     //     <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#5a3dff;color:white;text-decoration:none;border-radius:5px;">Verify New Email</a>
//     //   `,
//     // });
//     await transporter.sendMail({
//       from: '"Rubric" <rubric.capstone@gmail.com>',
//       to: newEmail,
//       subject: "Verify your new email address",
//       html: `
//         <p>Hello,</p>
//         <p>You requested to change your Rubric account email.</p>
//         <p>Click below to verify your new email:</p>
//         <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#5a3dff;color:white;text-decoration:none;border-radius:5px;">Verify New Email</a>
//       `,
//     });

//     return res.status(200).send({
//       success: true,
//       message: "Verification link sent to new email",
//     });
//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).send({ error: err.message });
//   }
// });

// // ✅ FINAL STEP: Handle the link verification
// app.get("/verifyNewEmail", async (req, res) => {
//   try {
//     const oldEmail = req.query.old as string;
//     const newEmail = req.query.new as string;

//     if (!oldEmail || !newEmail)
//       return res.status(400).send("Missing parameters.");

//     const user = await admin.auth().getUserByEmail(oldEmail);
//     await admin.auth().updateUser(user.uid, { email: newEmail });

//     await db.collection("email_change_requests").doc(oldEmail).delete();

//     return res.redirect("https://rubric-app-8f65c.web.app/home");
//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).send("Failed to verify new email.");
//   }
// });

// app.get("/debugUsers", async (req, res) => {
//   const list = await admin.auth().listUsers(10);
//   const emails = list.users.map(u => u.email);
//   res.send(emails);
// });


// export const api = functions.https.onRequest(app);

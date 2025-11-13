// File: scripts/run-journey-expansion.ts
import { initializeExpansionLevels, verifyExpansion } from './journey-expansion';

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Journey Expansion Setup (11-20)    ║');
  console.log('╚═══════════════════════════════════════╝\n');
  
  try {
    // Run expansion initialization
    const result = await initializeExpansionLevels();
    
    if (result.success) {
      console.log('\n⏳ Waiting 2 seconds before verification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the expansion
      console.log('\n' + '═'.repeat(40));
      await verifyExpansion();
    }
    
    console.log('\n✨ Expansion setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Expansion setup failed with error:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

main();
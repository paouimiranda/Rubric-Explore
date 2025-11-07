// File: scripts/run-journey-setup.ts
import { initializeJourneySystem, verifyJourneySystem } from './journey-setup';

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Journey System Setup Script        ║');
  console.log('╚═══════════════════════════════════════╝\n');
  
  try {
    // Run initialization
    const result = await initializeJourneySystem();
    
    if (result.success) {
      console.log('\n⏳ Waiting 2 seconds before verification...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the setup
      console.log('\n' + '═'.repeat(40));
      await verifyJourneySystem();
    }
    
    console.log('\n✨ Setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Setup failed with error:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

main();
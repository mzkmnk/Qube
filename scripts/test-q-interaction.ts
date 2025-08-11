import { QSession } from './src/lib/q-session';

async function testQInteraction() {
  console.log('🚀 Testing Q interaction...');
  const session = new QSession();
  
  try {
    // セッションを開始
    console.log('✨ Starting Q chat session...');
    await session.start('chat');
    console.log('✅ Connected to Amazon Q');
    
    // データ受信のリスナーを設定
    session.on('data', (type, data) => {
      console.log(`📨 Received (${type}):`, data);
    });
    
    session.on('error', (error) => {
      console.error('❌ Error:', error);
    });
    
    // メッセージを送信
    console.log('\n💬 Sending test message: "Hello, Amazon Q!"');
    session.send('Hello, Amazon Q!');
    
    // レスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n💬 Sending another message: "What can you help me with?"');
    session.send('What can you help me with?');
    
    // レスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n💬 Sending exit command: "/exit"');
    session.send('/exit');
    
    // 少し待ってから終了
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n🔚 Stopping session...');
    session.stop();
    process.exit(0);
  }
}

testQInteraction();

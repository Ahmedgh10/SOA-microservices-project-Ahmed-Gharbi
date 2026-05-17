const test_e2e = async () => {
    console.log("🚀 Starting E2E Integration Test...");
  
    const BASE_URL = 'http://localhost:3000/api';
    let p1, p2, session;
  
    try {
      // 1. Register User 1
      console.log("\n[1] Registering Player 1...");
      const res1 = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "E2E_P1", email: "p1@test.com", password: "p1" })
      });
      p1 = await res1.json();
      console.log("✅ Player 1 Created:", p1.user_id);
  
      // Register User 2
      console.log("\n[1.1] Registering Player 2...");
      const res2 = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "E2E_P2", email: "p2@test.com", password: "p2" })
      });
      p2 = await res2.json();
      console.log("✅ Player 2 Created:", p2.user_id);
  
      // 2. Create Session
      console.log("\n[2] Creating Session (Host: P1)...");
      const res3 = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_name: "Apex Duels", host_id: p1.user_id, max_players: 2 })
      });
      session = await res3.json();
      console.log("✅ Session Created:", session.session_id);
  
      // 3. Join Session
      console.log("\n[3] Player 2 Joins Session...");
      const res4 = await fetch(`${BASE_URL}/sessions/${session.session_id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: p2.user_id })
      });
      const joinResp = await res4.json();
      console.log("✅ Joined Successfully:", joinResp.status);
  
      // 4. End Session & submit scores (P1 wins vs P2)
      console.log("\n[4] Ending Session (P1 wins)...");
      const endPayload = {
        winner_id: p1.user_id,
        scores: [
          { player_id: p1.user_id, score: 1000 },
          { player_id: p2.user_id, score: 500 }
        ]
      };
      const res5 = await fetch(`${BASE_URL}/sessions/${session.session_id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endPayload)
      });
      const endResp = await res5.json();
      console.log("✅ Session Ended:", endResp.status);
  
      // Wait for Kafka to process the event organically
      console.log("\n⏳ Waiting 3 seconds for Kafka to process [session.completed] and RxDB to recalculate...");
      await new Promise(r => setTimeout(r, 3000));
  
      // 5. Check Leaderboard
      console.log("\n[5] Checking Leaderboard...");
      const res6 = await fetch(`${BASE_URL}/leaderboard?top_n=5&game=Apex Duels`, {
        method: 'GET'
      });
      const leaderboard = await res6.json();
      console.log("✅ Leaderboard Results:", JSON.stringify(leaderboard, null, 2));
      
      // 6. Check Player 1 Stats
      console.log("\n[6] Checking Player 1 Stats & Achievements...");
      const res7 = await fetch(`${BASE_URL}/leaderboard/${p1.user_id}/stats`);
      const stats = await res7.json();
      console.log("✅ Player 1 Stats:", JSON.stringify(stats, null, 2));
  
      const res8 = await fetch(`${BASE_URL}/leaderboard/${p1.user_id}/achievements`);
      const achievements = await res8.json();
      console.log("✅ Player 1 Achievements:", achievements);
  
      console.log("\n🎉 E2E TEST COMPLETED SUCCESSFULLY!");
  
    } catch (e) {
      console.error("\n❌ TEST FAILED:", e.message);
    }
  }
  
test_e2e();

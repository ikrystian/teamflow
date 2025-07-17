// Simple test script to verify team editing API endpoint
// Run this after logging in and creating a team

const testTeamEdit = async () => {
  try {
    // First, get the list of teams
    console.log('Fetching teams...');
    const teamsResponse = await fetch('/api/teams');
    const teamsData = await teamsResponse.json();
    console.log('Teams:', teamsData);

    if (teamsData.teams && teamsData.teams.length > 0) {
      const firstTeam = teamsData.teams[0];
      console.log('Testing with team:', firstTeam.name, 'ID:', firstTeam.id);

      // Test GET single team
      console.log('Testing GET /api/teams/' + firstTeam.id);
      const getResponse = await fetch(`/api/teams/${firstTeam.id}`);
      const getData = await getResponse.json();
      console.log('GET response:', getData);

      // Test PATCH team (update name)
      const newName = firstTeam.name + ' (Edited)';
      console.log('Testing PATCH /api/teams/' + firstTeam.id + ' with new name:', newName);
      
      const patchResponse = await fetch(`/api/teams/${firstTeam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });
      
      const patchData = await patchResponse.json();
      console.log('PATCH response:', patchData);

      if (patchResponse.ok) {
        console.log('✅ Team editing API works correctly!');
        
        // Revert the name change
        const revertResponse = await fetch(`/api/teams/${firstTeam.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: firstTeam.name }),
        });
        
        if (revertResponse.ok) {
          console.log('✅ Name reverted successfully');
        }
      } else {
        console.log('❌ Team editing failed:', patchData);
      }
    } else {
      console.log('No teams found. Please create a team first.');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Instructions for manual testing
console.log(`
🧪 Team Editing Test Instructions:

1. Open browser console (F12)
2. Navigate to http://localhost:3001
3. Sign in or register
4. Go to Teams page and create a team if none exist
5. Run this command in console: testTeamEdit()
6. Check console output for test results

Manual UI Testing:
1. Go to Teams page
2. Click the Settings (⚙️) button on any team card
3. Edit the team name in the dialog
4. Click "Update Team"
5. Verify the team name changes in the list
6. Verify the dialog closes automatically

Expected behaviors:
- ✅ Settings button opens edit dialog
- ✅ Dialog shows current team name
- ✅ Update button is disabled if no changes
- ✅ Team name updates successfully
- ✅ List refreshes after update
- ✅ Error handling for invalid names
`);

// Make function available globally for testing
window.testTeamEdit = testTeamEdit;

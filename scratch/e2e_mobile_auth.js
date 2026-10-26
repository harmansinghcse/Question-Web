const BASE_URL = 'http://localhost:3000/api';

async function testMobileAuth() {
  console.log('=== 1. Testing Academic Endpoint (Unauthenticated) ===');
  const subjectsRes = await fetch(`${BASE_URL}/subjects`);
  if (!subjectsRes.ok) throw new Error(`Subjects failed: ${subjectsRes.status}`);
  const subjects = await subjectsRes.json();
  console.log(`Success: Found ${subjects.length} subjects without authentication.`);

  console.log('\n=== 2. Testing Student Registration ===');
  const testEmail = `rn_student_${Date.now()}@example.com`;
  const registerPayload = {
    displayName: 'Mobile Student',
    email: testEmail,
    password: 'StrongPassword123!',
  };
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${regRes.status} ${await regRes.text()}`);
  const registeredUser = await regRes.json();
  console.log('Registration succeeded:', {
    userId: registeredUser.userId,
    email: registeredUser.email,
    displayName: registeredUser.displayName,
    role: registeredUser.role,
    passwordHash: registeredUser.passwordHash, // must be undefined
  });
  if (registeredUser.passwordHash !== undefined) throw new Error('passwordHash leaked in response!');
  if (registeredUser.role !== 'STUDENT') throw new Error(`Unexpected role: ${registeredUser.role}`);

  console.log('\n=== 3. Testing Duplicate Registration (Expect 409) ===');
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload),
  });
  console.log(`Duplicate status: ${dupRes.status}`);
  if (dupRes.status !== 409) throw new Error(`Expected 409, got ${dupRes.status}`);
  const dupBody = await dupRes.json();
  console.log('Duplicate error message:', dupBody.message);

  console.log('\n=== 4. Testing Login with Incorrect Password (Expect 401) ===');
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword999!' }),
  });
  console.log(`Bad login status: ${badLoginRes.status}`);
  if (badLoginRes.status !== 401) throw new Error(`Expected 401, got ${badLoginRes.status}`);
  const badLoginBody = await badLoginRes.json();
  console.log('Bad login message:', badLoginBody.message);

  console.log('\n=== 5. Testing Login with Valid Credentials ===');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'StrongPassword123!' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  const loginData = await loginRes.json();
  console.log('Login succeeded:');
  console.log('  accessToken present:', !!loginData.accessToken);
  console.log('  refreshToken present (for Expo SecureStore):', !!loginData.refreshToken);
  console.log('  user profile:', loginData.user.displayName, `(${loginData.user.email})`);

  const initialRefreshToken = loginData.refreshToken;
  const initialAccessToken = loginData.accessToken;

  console.log('\n=== 6. Testing Academic Endpoint with Bearer Access Token ===');
  const authQuestionsRes = await fetch(`${BASE_URL}/questions`, {
    headers: { Authorization: `Bearer ${initialAccessToken}` },
  });
  if (!authQuestionsRes.ok) throw new Error(`Authenticated questions failed: ${authQuestionsRes.status}`);
  const questions = await authQuestionsRes.json();
  console.log(`Success: Found ${questions.length} questions using Bearer token.`);

  console.log('\n=== 7. Testing Refresh Token Rotation ===');
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: initialRefreshToken }),
  });
  if (!refreshRes.ok) throw new Error(`Refresh failed: ${refreshRes.status} ${await refreshRes.text()}`);
  const refreshData = await refreshRes.json();
  console.log('Token rotated successfully:');
  console.log('  new accessToken present:', !!refreshData.accessToken);
  console.log('  new refreshToken different from initial:', refreshData.refreshToken !== initialRefreshToken);

  const rotatedRefreshToken = refreshData.refreshToken;

  console.log('\n=== 8. Testing Logout ===');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
  });
  if (!logoutRes.ok) throw new Error(`Logout failed: ${logoutRes.status}`);
  const logoutData = await logoutRes.json();
  console.log('Logout result:', logoutData);

  console.log('\n=== 9. Testing Post-Logout Refresh (Expect 401 Session Revoked) ===');
  const postLogoutRefresh = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
  });
  console.log(`Post-logout refresh status: ${postLogoutRefresh.status}`);
  if (postLogoutRefresh.status !== 401) throw new Error(`Expected 401, got ${postLogoutRefresh.status}`);
  console.log('Post-logout refresh message:', (await postLogoutRefresh.json()).message);

  console.log('\n=== ALL END-TO-END MOBILE AUTH TESTS PASSED PERFECTLY! ===');
}

testMobileAuth().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

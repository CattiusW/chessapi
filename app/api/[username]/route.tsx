// app/api/[username]/route.tsx
import { ImageResponse } from '@vercel/og';

// This is required for Next.js to deploy this on the Edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const username = params.username;

  if (!username) {
    return new Response('Username not specified', { status: 400 });
  }

  try {
    // Fetch profile and stats data from the Chess.com API
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${username}`),
      fetch(`https://api.chess.com/pub/player/${username}/stats`)
    ]);

    const [profileData, statsData] = await Promise.all([
      profileRes.json(),
      statsRes.json()
    ]);

    // Handle cases where the user does not exist
    if (profileData.code === 0 || statsData.code === 0) {
      return new Response(`User '${username}' not found`, { status: 404 });
    }

    // Extract stats, using "N/A" as a fallback
    const rapidRating = statsData.rapid?.last.rating || 'N/A';
    const blitzRating = statsData.blitz?.last.rating || 'N/A';
    const bulletRating = statsData.bullet?.last.rating || 'N/A';
    const avatarUrl = profileData.avatar || 'https://www.chess.com/bundles/web/images/user-image.svg';

    // Return the image response using the ImageResponse API
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#2e2e2e',
            color: 'white',
            fontFamily: 'sans-serif',
            padding: 32,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            {/* User Avatar */}
            <img
              width="96"
              height="96"
              src={avatarUrl}
              style={{ borderRadius: '50%', marginRight: 24 }}
              alt="User Avatar"
            />
            {/* Username and Stats */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>{username}</h1>
              <p style={{ fontSize: 24, margin: '8px 0 0 0', color: '#ccc' }}>Rapid: {rapidRating}</p>
              <p style={{ fontSize: 24, margin: 0, color: '#ccc' }}>Blitz: {blitzRating}</p>
              <p style={{ fontSize: 24, margin: 0, color: '#ccc' }}>Bullet: {bulletRating}</p>
            </div>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 250,
      },
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}

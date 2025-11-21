import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';

// This is required for Next.js to deploy this on the Edge runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const username = params.username;

  if (!username) {
    return new Response('Username not specified', { status: 400 });
  }

  const { searchParams } = new URL(request.url);

  // Parse width and height from search parameters, falling back to defaults
  const requestedWidth = parseInt(searchParams.get('width') || '600', 10);
  const requestedHeight = parseInt(searchParams.get('height') || '250', 10);

  // Maximum size constraints
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 600;

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

    // Handle cases where the user does not exist or API request failed
    if (!profileRes.ok || !statsRes.ok || profileData.code === 0 || statsData.code === 0) {
      return new Response(`User '${username}' not found or API error`, { status: 404 });
    }

    // Extract stats using nullish coalescing operator (??)
    const rapidRating = statsData.chess_rapid?.last?.rating ?? 'N/A';
    const blitzRating = statsData.chess_blitz?.last?.rating ?? 'N/A';
    const bulletRating = statsData.chess_bullet?.last?.rating ?? 'N/A';
    const avatarUrl = profileData.avatar || 'https://www.chess.com/bundles/web/images/user-image.svg';

    // --- Dynamic Resizing Logic ---
    let finalWidth = Math.min(requestedWidth, MAX_WIDTH);
    let finalHeight = Math.min(requestedHeight, MAX_HEIGHT);
    const originalWidth = 600; // Original component width
    const originalHeight = 250; // Original component height

    // If both are provided, calculate which one to use based on aspect ratio
    if (requestedWidth && requestedHeight) {
      const originalAspect = originalWidth / originalHeight;
      const requestedAspect = requestedWidth / requestedHeight;

      if (requestedAspect > originalAspect) {
        // Requested is wider, scale based on height
        finalWidth = Math.round(requestedHeight * originalAspect);
      } else {
        // Requested is taller, scale based on width
        finalHeight = Math.round(requestedWidth / originalAspect);
      }
    } else if (requestedWidth) {
      // Scale based on provided width only
      finalHeight = Math.round(requestedWidth / (originalWidth / originalHeight));
    } else if (requestedHeight) {
      // Scale based on provided height only
      finalWidth = Math.round(requestedHeight * (originalWidth / originalHeight));
    }
    // --- End Dynamic Resizing Logic ---

    // Return the image response
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
            transform: `scale(${finalWidth / originalWidth}, ${finalHeight / originalHeight})` // Apply scale transform
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
        width: finalWidth,
        height: finalHeight,
      },
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}

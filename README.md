# Video Vault

A video library backed by private Azure Blob Storage. Upload files or import videos from direct HTTPS links, then play or download them from the home page. Uploads require a password. Videos go directly to Azure rather than through Vercel functions.

## Deploy on Vercel

1. Import this GitHub repository in Vercel.
2. Select **Other** as the framework. Leave **Root Directory** at the repository root. Build Command: `npm run build`. Output Directory: `public`. The included `vercel.json` supplies these settings.
3. Add these environment variables in Vercel:
   - `AZURE_STORAGE_ACCOUNT`: `stvideovaultmk261002`
   - `AZURE_STORAGE_CONTAINER`: `videos`
   - `AZURE_STORAGE_KEY`: a storage access key from the Azure portal; mark it sensitive.
   - `UPLOAD_PASSWORD`: choose an upload password; mark it sensitive.
4. Deploy. In the Azure storage account's Blob service CORS settings, add the exact Vercel origin, such as `https://your-project.vercel.app`. Allow methods `GET`, `HEAD`, `PUT`, and `OPTIONS`, all request headers, and all exposed headers. Set Max Age to `3600`. Preserve the existing Sites origin. Add the exact origin for a custom domain or preview deployment if using one.
5. Check that the library loads, both upload options work, and Play and Download work for a video.

The Vercel app does not inherit the private Sites access policy. Configure Vercel Deployment Protection before sharing if visitors should be restricted. Uploads always require the configured password. Never commit credentials or include them in browser code. `.env.example` lists the required values without secrets.

## Link uploads

Use a direct HTTPS video file link accessible without cookies or a login. Signed file URLs are supported. YouTube watch pages and streaming manifests are not video file links. Optionally specify a filename ending in `.mp4`, `.webm`, `.mov`, `.m4v`, or `.ogv` if the link has no filename.

Azure's URL import supports files up to 5,000 MiB and requires the source to return a valid Content-Length header. Some servers block Azure fetching; use the file upload option instead. MP4 and WebM work best for browser playback.

## Development

Node.js 22 is required. Run `npm run build` to generate the static page and server page module. This project has no runtime dependencies. Edit `index.html` for the interface, `worker.mjs` for Azure authorization, and `api/index.js` for the Vercel adapter.

Documentation: [Azure Put Blob From URL](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob-from-url), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js).

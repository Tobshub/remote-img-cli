import path from "path";
import fs from "fs/promises";
import mimeTypes from "mime-types";
import axios from "axios";
import { config } from "dotenv";

const envStorePath =
  process.env.NODE_ENV !== "dev"
    ? `${process.env.HOME}/.local/.tobsmg-env`
    : `${process.cwd()}/.env`;
// load "env" file into `process.env`
config({ path: envStorePath });

console.log("Tobsmg CLI (v1.0.0) - upload images to Tobsmg server");

const args = process.argv;
/** Server url to upload images to */
const remoteServerUrl =
  process.env.NODE_ENV !== "dev"
    ? process.env.TOBSMG_SERVER_URL
    : "http://localhost:4000";
/** Auth token for upload requests */
const tobsmgToken = process.env.TOBSMG_TOKEN ?? "";

async function main() {
  const isHelp = args.includes("--help") || args.includes("-h");
  if (isHelp) {
    displayHelpMessage();
    return;
  }

  const remoteServerUrlStart = args.indexOf("--server");
  if (remoteServerUrlStart > -1) {
    const serverUrl = args[remoteServerUrlStart + 1];
    if (!serverUrl) {
      console.log("Server url is set to:", remoteServerUrl);
      return;
    }
    await fs
      .writeFile(
        envStorePath,
        `TOBSMG_SERVER_URL="${serverUrl}"\nTOBSMG_TOKEN="${tobsmgToken}"`,
        "utf-8"
      )
      .then(() => console.log("Set server url for tobsmg"))
      .catch((_) => console.error("Failed to write server url"));
    return;
  }

  if (!remoteServerUrl) {
    console.error(
      "Please set the server url with `tobsmg --server <server-url>`"
    );
    return;
  }

  const loginArgsStart = args.indexOf("--login");
  if (loginArgsStart > -1) {
    const email = args[loginArgsStart + 1];
    const password = args[loginArgsStart + 2];
    if (!email || !password) {
      console.error("Email or Password is missing");
      return;
    }
    await getUserToken(email, password);
    return;
  }

  if (!tobsmgToken) {
    console.error(
      "Error: Auth Token is missing\nPlease run `tobsmg --login <email> <password>`"
    );
    return;
  }

  const uploadPathsStart = args.indexOf("--upload");
  if (uploadPathsStart === -1) {
    displayHelpMessage();
    return;
  }
  const searchPathIndexStart = uploadPathsStart + 1;

  const location = process.cwd();
  for (let i = searchPathIndexStart; i < args.length; i++) {
    await uploadImageAtPath(args[i], location);
  }
}

main();

/** Reads file data and sends it to the server */
async function uploadImageAtPath(imageLocation: string, pwd: string) {
  const relativePath = path.resolve(pwd, imageLocation);
  const fileType = mimeTypes.lookup(relativePath);
  const fileData = await fs
    .readFile(relativePath, { encoding: "base64" })
    .catch((_) => console.error("Can't Find Image File:", relativePath));
  if (!fileData) return;
  if (!fileType || !fileType.startsWith("image")) {
    console.error("Can't upload non-image file:", relativePath);
    return;
  }
  await imageUpload(fileData, fileType, relativePath);
}

/** Send image data and type to ther server */
async function imageUpload(data: string, type: string, imagePath: string) {
  console.log("Uploading image at:", imagePath);
  const res = await axios
    .post(
      "/api/upload.permUpload",
      { data, type },
      {
        baseURL: remoteServerUrl,
        headers: { authorization: tobsmgToken },
      }
    )
    .catch((_) => console.error("Failed to upload image", _));
  if (!res) {
    return;
  }
  const imgRef = res.data.result.data.value;
  console.log(`
Uploaded Image at: ${imagePath}
Image is available at: ${remoteServerUrl}/img/${imgRef}
`);
}

/** Request user token */
async function getUserToken(email: string, password: string) {
  const res = await axios
    .post("/api/auth.login", { email, password }, { baseURL: remoteServerUrl })
    .catch((_) => null);
  if (!res) {
    console.error("Authentication Failed: Please try again");
    return;
  }
  const token = res.data.result.data.value;
  console.log("Writing user token to:", envStorePath);
  await fs
    .writeFile(
      envStorePath,
      `TOBSMG_SERVER_URL="${remoteServerUrl ?? ""}"\nTOBSMG_TOKEN="${token}"`,
      "utf-8"
    )
    .catch((_) => console.error("Failed to write token"));
}

/** General usage instructions */
function displayHelpMessage() {
  console.log(`
Tobsmg CLI is a tool to upload images to the Tobsmg Remote Server
You can upload any number of images at once by running: 
\`tobsmg --upload path-to-img1 path-to-img2 ... path-to-img<n>\`
or for temporary uploads(lasts 30 minutes) run:
\`tobsmg --tmp-upload path-to-img1 path-to-img2 ... path-to-img<n>\`

Before you use Tobsmg CLI, make sure to run \`tobsmg --login <email> <password>\` to get an auth token
The auth token expires after 30 days, so make sure to login again when the time comes.

Make sure you run \`tobsmg --server <server-url>\` to set the server url for image uploads to set the server url for image uploads.
`);
}

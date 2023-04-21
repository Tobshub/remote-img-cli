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

console.log("Tobsmg CLI v1.0.0 - upload images to Tobsmg server");

const args = process.argv;
/** Server url to upload images to */
const remoteServerUrl = process.env.TOBSMG_SERVER_URL;
/** Auth token for upload requests */
const tobsmgToken = process.env.TOBSMG_TOKEN ?? "";

async function main() {
  const command = args[2];
  switch (command) {
    case "--help":
    case "-h": {
      displayHelpMessage();
      break;
    }
    case "--server": {
      const serverUrl = args[3];
      if (!serverUrl) {
        console.log("Server url is set to:", remoteServerUrl);
        break;
      }
      await fs
        .writeFile(
          envStorePath,
          `TOBSMG_SERVER_URL="${serverUrl}"\nTOBSMG_TOKEN="${tobsmgToken}"`,
          "utf-8"
        )
        .then(() => console.log("Set server url for tobsmg"))
        .catch((_) => console.error("Failed to write server url"));
      break;
    }

    case "--auth":
    case "--login": {
      if (!remoteServerUrl) {
        console.error(
          "Please set the server url with `tobsmg --server <server-url>`"
        );
        break;
      }

      const email = args[3];
      const password = args[4];
      if (!email || !password) {
        console.error("Email or Password is missing");
        break;
      }
      await getUserToken(email, password);
      break;
    }
    case "-u":
    case "--upload":
    case "-t":
    case "--temp-upload": {
      if (!tobsmgToken) {
        console.error(
          "Error: Auth Token is missing\nPlease run `tobsmg --login <email> <password>`"
        );
        break;
      }

      const location = process.cwd();
      for (let i = 3; i < args.length; i++) {
        await uploadImageAtPath(
          args[i],
          location,
          command === "-t" || command === "--temp-upload"
            ? { isTemp: true }
            : {}
        );
      }
      break;
    }
    default: {
      displayHelpMessage();
      break;
    }
  }
}

main();

/** Reads file data and sends it to the server */
async function uploadImageAtPath(
  imageLocation: string,
  pwd: string,
  options?: { isTemp?: boolean }
) {
  const relativePath = path.resolve(pwd, imageLocation);
  const fileType = mimeTypes.lookup(relativePath);
  const fileName = path.basename(relativePath);
  const fileData = await fs
    .readFile(relativePath, { encoding: "base64" })
    .catch((_) => console.error("Can't Find Image File:", relativePath));
  if (!fileData) return;
  if (!fileType || !fileType.startsWith("image")) {
    console.error("Can't upload non-image file:", relativePath);
    return;
  }
  console.log("Uploading image at:", relativePath);
  await uploadImageToServer(fileData, fileType, fileName, options);
}

/** Send image data to ther server */
async function uploadImageToServer(
  data: string,
  type: string,
  name: string,
  options?: { isTemp?: boolean }
) {
  const res = await axios
    .post(
      options?.isTemp ? "/api/upload.tempUpload" : "/api/upload.permUpload",
      { data, type, name },
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
  console.log(
    `Image is available at: ${remoteServerUrl}/img/${imgRef}`,
    options?.isTemp ? "for 30 minutes" : ""
  );
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
Usage:

    --login <email> <password>  Authenticate user and get auth token from server                    
    --server                    Check the set remote server url
    --server <server-url>       Configure the remote server url
    -u, --upload                Upload files to the server. E.g. -u ./path/to/img1 ../path/to/img2 ...
    -t, --temp-upload           Temporarily Upload files to the server 
    -h, --help                  Display this help message
`);
}

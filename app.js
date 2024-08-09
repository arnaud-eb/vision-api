import { openai } from "./openai.js";

import { exec } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";
import Queue from "queue";
import puppeteer from "puppeteer";

const websiteToUse = "https://www.flightradar24.com";

let conversationHistory = [
  {
    role: "system",
    content: `You are an enthusiastic and knowledgeable commentator for real-time flight traffic provided by Flightradar24. Your job is to provide insightful and engaging commentary on flight data, including information such as flight numbers, airlines, departure and arrival airports, altitude, speed, and other relevant details. You should also add interesting facts about airlines, airports, and aviation in general. Always keep your tone friendly, informative, and enthusiastic.`,
  },
];

const screenshotsDir = "./screenshots";
const audioDir = "./audio";
const filePrefix = "screenshot";
const audioOutputPrefix = "audio";

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

/**
 * Creates a readline interface for reading input from the standard input and writing output to the standard output.
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts the user for a key press and returns the input as a Promise.
 * @param {string} question - The question to display to the user.
 * @returns {Promise<string>} - A promise that resolves with the user's input.
 */
function promptForKeyPress(question) {
  return new Promise((resolve) => {
    rl.question(question, (userInput) => {
      resolve(userInput);
    });
  });
}

/**
 * Plays an audio file using the `afplay` command.
 *
 * @param {string} filePath - The path to the audio file to be played.
 * @returns {Promise<void>} - A promise that resolves when the audio finishes playing, or rejects if an error occurs.
 */
function playAudio(filePath) {
  return new Promise((resolve, reject) => {
    exec(`afplay ${filePath}`, (error) => {
      if (error) {
        console.error("Error playing audio:", error);
        reject(error);
      }
      resolve();
    });
  });
}

let audioPlaybackQueue = new Queue({ concurrency: 1, autostart: true });

async function startTakingScreenshots(url, outputPathPrefix) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/opt/homebrew/bin/chromium",
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 800 });
  await page.setJavaScriptEnabled(true);
  await page.goto(url, { waitUntil: "networkidle2" });

  const mode = await promptForKeyPress(
    "Choose mode:\n1: Manual mode\n2: Continuous mode\n\nEnter 1 or 2 and press return: "
  );

  if (mode === "1") {
    while (true) {
      await promptForKeyPress("\nPress return to trigger (Ctrl+C to exit)");
      await processScreenshot(page, outputPathPrefix);
    }
  } else if (mode === "2") {
    console.log("The script will run continuously (Press Ctrl+C to stop)");
    while (true) {
      await processScreenshot(page, outputPathPrefix);
    }
  }
}

async function processScreenshot(page, outputPathPrefix) {
  const timestamp = new Date().toISOString().replace(/:/g, "_");
  const filename = `${outputPathPrefix}_${timestamp}.png`;
  const screenshotPath = `${screenshotsDir}/${filename}`;
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // TODO: use fs read async method instead
  const base64Image = fs.readFileSync(screenshotPath).toString("base64");

  const userMessage = {
    role: "user",
    content: [
      {
        type: "text",
        text: "Describe the current flight traffic on the screen.",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
          detail: "low",
        },
      },
    ],
  };

  conversationHistory.push(userMessage);

  const params = {
    model: "gpt-4o",
    messages: conversationHistory,
  };

  try {
    const response = await openai.chat.completions.create(params);
    const content = response.choices[0].message.content;

    conversationHistory.push({
      role: "assistant",
      content,
    });

    await streamedAudio(content, audioOutputPrefix);
  } catch (error) {
    console.error("Error processing screenshot:", error);
  }
}

async function streamedAudio(inputText, outputPathPrefix) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: inputText,
    });
    const audioBuffer = Buffer.from(await mp3.arrayBuffer());
    const timestamp = new Date().toISOString().replace(/:/g, "_");
    const audioFilename = `${outputPathPrefix}_${timestamp}.mp3`;
    const audioPath = `${audioDir}/${audioFilename}`;
    await fs.promises.writeFile(audioPath, audioBuffer);

    audioPlaybackQueue.push(async function (cb) {
      console.log(`\n${inputText}\n`);
      try {
        await playAudio(audioPath);
        cb();
      } catch (error) {
        console.error("Error in audio playback:", error);
        cb();
      }
    });
  } catch (error) {
    console.error("Error in streamedAudio:", error.message);
  }
}

startTakingScreenshots(websiteToUse, filePrefix);

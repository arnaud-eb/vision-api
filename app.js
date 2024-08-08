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
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 800 });
  await page.setJavaScriptEnabled(true);
  await page.goto(url, { waitUntil: "networkidle2" });

  const mode = await promptForKeyPress(
    "Choose mode:\n1: Manual mode\n2: Continuous mode\n\nEnter 1 or 2 and press return: "
  );
}

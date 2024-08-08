import { openai } from "./openai.js";

import fs from "node:fs";

const base64Image = fs.readFileSync("images/menu.jpg", {
  encoding: "base64",
});

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content:
        "Return a JSON structure based on the requirements of the user. Only return the JSON structure, nothing else. Do not return ```json",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Create a JSON structure for all the items on the menu. Return only the JSON structure.",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpg;base64,${base64Image}`,
            // detail: "low",
          },
        },
      ],
    },
  ],
});

console.log(response.choices[0].message.content);

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as firestore from 'firebase-admin/firestore';

import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };
admin.initializeApp({
});

const db = firestore.getFirestore();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔑 Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyCsOby2TzQIS9comQEzrf8WawKctdwFpz4"); // Replace with your real key
admin.initializeApp({credential: admin.credential.cert(serviceAccount),});
// 🎯 POST - Evaluate student answer
app.post("/evaluate", async (req, res) => {
  const { title, answer } = req.body;
  let feedback;
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  try {
    // Construct the prompt for the AI
    const prompt = `
      You are an AI assistant for grading student assignments.
      Evaluate this student's answer based on correctness, clarity, and depth.
      Give a one-line feedback and assign a grade (A, B, C, D, or F).
      Question: ${title}
      Student Answer: ${answer}
      Format:
      Grade: <grade>
      Feedback: <one-line feedback>
    `;

    // Generate content using the AI model
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log(responseText)

    // Extract grade and feedback from the response
    const gradeMatch = responseText.match(/Grade: (.*?)\n/);
    const feedbackMatch = responseText.match(/Feedback: (.*)/);
    const grade = gradeMatch ? gradeMatch[1].trim() : "Not Assigned";
    feedback = feedbackMatch ? feedbackMatch[1].trim() : "No Feedback from AI";

    //  Store the evaluation result in Firestore
    const docRef =  await firestore.addDoc(firestore.collection(db, "grades"), {
      title,
      answer,
      grade,
      feedback,
      createdAt: firestore.Timestamp.now()
    });
    console.log("Grade and feedback stored successfully in Firestore");

    // Include the document ID in the response
    return res.status(200).json({ id: docRef.id, ...finalResponse });
  } catch (error) {
    console.error("❌ AI grading failed:", error);
    return res.status(500).json({ error: "AI grading failed" }); // Send an error response
  }

});

app.listen(5000, () =>   console.log("🚀 Server running on http://localhost:5000"));

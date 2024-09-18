const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const TELEGRAM_API_TOKEN = '7502487259:AAGUk3UhvnMub0V3_ipIVECMn-7fjl1rMuE';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_API_TOKEN}`;

const userState = {};

const validLanguageCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'hi'];

function isValidLanguageCode(code) {
    return validLanguageCodes.includes(code);
}

const app = express();
app.use(bodyParser.json());

app.post("/webhook", async(req, res) => {
    const message = req.body.message;

    if (message && message.text) {
        const chatId = message.chat.id;
        const text = message.text;

        if (text === "/start") {
            userState[chatId] = { step: 'askLanguage' };
            await sendMessage(chatId, "Hi! Please provide the text you want to translate.");
        } else if (userState[chatId] && userState[chatId].step === 'askLanguage') {
            userState[chatId].text = text;
            userState[chatId].step = 'askSourceLanguage';
            await sendMessage(chatId, "Great! Now, please specify the language code of the text (e.g., 'en', 'es', 'fr').");
        } else if (userState[chatId] && userState[chatId].step === 'askSourceLanguage') {
            if (isValidLanguageCode(text)) {
                userState[chatId].sourceLanguage = text;
                userState[chatId].step = 'askTargetLanguage';
                await sendMessage(chatId, "Got it. Now, please specify the target language code (e.g., 'en', 'es', 'fr').");
            } else {
                await sendMessage(chatId, "Invalid source language code. Please provide a valid code (e.g., 'en', 'es').");
            }
        } else if (userState[chatId] && userState[chatId].step === 'askTargetLanguage') {
            if (isValidLanguageCode(text)) {
                userState[chatId].targetLanguage = text;
                const translatedText = await translateText(userState[chatId].text, userState[chatId].sourceLanguage, userState[chatId].targetLanguage);
                await sendMessage(chatId, `Translated text: ${translatedText}`);
                delete userState[chatId];
            } else {
                await sendMessage(chatId, "Invalid target language code. Please provide a valid code (e.g., 'en', 'es').");
            }
        } else {
            await sendMessage(chatId, "I didn't understand that. Please use /start to begin.");
        }
    }

    res.sendStatus(200);
});

async function translateText(text, sourceLanguage, targetLanguage) {
    try {
        const response = await axios.get("https://api.mymemory.translated.net/get", {
            params: {
                q: text,
                langpair: `${sourceLanguage}|${targetLanguage}`
            }
        });

        if (response.data && response.data.responseData && response.data.responseData.translatedText) {
            return response.data.responseData.translatedText;
        } else {
            throw new Error('Invalid response structure');
        }
    } catch (error) {
        if (error.response) {
            return `Translation error: ${JSON.stringify(error.response.data)}`;
        } else {
            return `Translation error: ${error.message}`;
        }
    }
}

async function sendMessage(chatId, text) {
    try {
        await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: text,
        });
    } catch (error) {
        console.error("Error sending message:", error.response ? error.response.data : error.message);
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot is listening on port ${PORT}`);
});

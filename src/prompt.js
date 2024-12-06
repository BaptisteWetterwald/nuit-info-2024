export default class OpenAIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async getCompletion(prompt) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // You can choose an appropriate model.
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error("Failed to fetch completion from OpenAI");
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}

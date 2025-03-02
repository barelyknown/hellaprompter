# Metadata Schema

Each prompt in hellaprompter requires a `metadata.json` file with the following structure:

```json
{
  "prompt": "The original prompt text",
  "title": "A title for the article",
  "date": "YYYY-MM-DD",
  "service": "ChatGPT (gpt-4o)",
  
  "socialDescription": "A concise 1-2 sentence description for social media sharing",
  
  "illustration": true,
  "illustrationPath": "illustration.png",
  "sceneDescription": "Description of the illustration scene",
  "illustrationExplanation": "Explanation of the illustration",
  
  "postToX": true,
  "xPostUrl": "https://x.com/username/status/123456789"
}
```

## Required Fields

- **prompt**: The original prompt text sent to the AI service
- **title**: A descriptive title for the article
- **date**: Publication date in YYYY-MM-DD format
- **service**: The AI service used (e.g., "ChatGPT (gpt-4o)", "ChatGPT Deep Research")

## Social Media Fields

- **socialDescription**: A concise 1-2 sentence description for social media sharing (max 150 chars)
  - If not provided, will be auto-generated during build if OPENAI_API_KEY is available
  
- **postToX**: Boolean flag indicating if this prompt should be posted to X (Twitter)
  - If set to `true`, the prompt will be posted to X during build if it hasn't been posted yet
  - Requires X API credentials in `.env` file

- **xPostUrl**: URL of the X post (automatically populated after posting)
  - Will be set automatically after the prompt is posted to X
  - Acts as a flag to prevent posting the same prompt multiple times

## Illustration Fields

- **illustration**: Boolean flag indicating if this prompt has an illustration
- **illustrationPath**: Path to the illustration file (relative to the prompt directory)
- **sceneDescription**: Detailed description of the illustration scene
- **illustrationExplanation**: Explanation of why the illustration was chosen

## Notes

- The build process will automatically generate `socialDescription` if not provided
- The build process will automatically post to X if `postToX` is set to `true` and API credentials are available
- A prompt can only be posted to X once; subsequent builds will skip posting if `xPostUrl` is set
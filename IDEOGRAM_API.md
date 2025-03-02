# Ideogram API Integration Guide

## Overview
This document provides instructions for integrating with the Ideogram API to generate New Yorker-style cartoon illustrations for hellaprompter articles.

## API Access
To use the Ideogram API, you'll need an Ideogram API key that should be stored in your environment variables as `IDEOGRAM_API_KEY`.

## Endpoint
The primary endpoint for image generation is:
```
https://api.ideogram.ai/generate
```

## Request Format
When making requests to generate New Yorker-style cartoons:

```javascript
const url = 'https://api.ideogram.ai/generate';
const options = {
  method: 'POST',
  headers: {
    'Api-Key': process.env.IDEOGRAM_API_KEY, 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    image_request: {
      prompt: "New Yorker-style cartoon showing...",
      aspect_ratio: "ASPECT_10_16",
      model: "V_2",
      negative_prompt: "text, words, writing, caption, signature",
      style_prompt: "black and white drawing, new yorker cartoon, simple linework"
    }
  })
};
```

### Key Parameters
- `prompt`: The scene description for the cartoon
- `aspect_ratio`: Use "ASPECT_10_16" for proper proportions
- `model`: Use "V_2" for best results with cartoon styles
- `negative_prompt`: Use to avoid text/words in the generated images
- `style_prompt`: Additional styling guidance

## Response Format
The API returns a JSON response with URLs to the generated images:

```javascript
{
  "created": "2000-01-23T04:56:07Z",
  "data": [
    {
      "prompt": "New Yorker-style cartoon showing...",
      "resolution": "1024x1024",
      "is_image_safe": true,
      "seed": 12345,
      "url": "https://ideogram.ai/api/images/direct/8YEpFzHuS-S6xXEGmCsf7g",
      "style_type": "REALISTIC"
    }
  ]
}
```

## Important Notes
1. Image URLs are temporary and will expire - always download the images promptly
2. A single request typically generates one image, but can be configured for multiple
3. For best New Yorker style cartoons, ensure your prompt clearly specifies:
   - Black and white ink style
   - Minimalist line art
   - No text/captions
   - Single-panel composition
   - Clear focal point

## Implementation
See the `generate-illustrations.js` script for complete integration with OpenAI for scene generation and image selection.


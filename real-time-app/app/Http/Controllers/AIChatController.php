<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use OpenAI\Laravel\Facades\OpenAI;

class AIChatController extends Controller
{
    public function __invoke(Request $request)
    {
        return response()->stream(function () use ($request) {
            $stream = OpenAI::chat()->createStreamed([
                'model' => 'llama-3.3-70b-versatile', // Sirf ye line badalni hai
                'messages' => [['role' => 'user', 'content' => $request->message]],
            ]);

            foreach ($stream as $response) {
                $text = $response->choices[0]->delta->content;
                if ($text) {
                    echo "data: " . json_encode(['content' => $text]) . "\n\n";
                    ob_flush(); flush();
                }
            }
            echo "data: [DONE]\n\n";
            ob_flush(); flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no', // Nginx ke liye zaroori hai
        ]);
    }
}

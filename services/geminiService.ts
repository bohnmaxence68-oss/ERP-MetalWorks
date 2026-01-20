import { GoogleGenAI, Type } from "@google/genai";
import { Task, TaskStatus } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert industrial project manager specializing in boilermaking (chaudronnerie). 
Your goal is to break down a project description into a list of tasks suitable for a Gantt chart.
The output must be a JSON object containing a list of tasks with realistic durations (in days) and logical dependencies.
Use the Critical Path Method logic: identify which tasks must happen sequentially.
Common boilermaking phases: Engineering, Procurement, Cutting, Rolling/Bending, Welding, Assembly, NDT (Non-Destructive Testing), Surface Treatment, Shipping.
`;

export const generateProjectPlan = async (description: string): Promise<Task[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a project plan for: "${description}". The project starts on Day 0.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique ID (e.g., '1', '2')" },
                  name: { type: Type.STRING, description: "Task name (French)" },
                  duration: { type: Type.NUMBER, description: "Duration in days" },
                  predecessors: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "IDs of predecessor tasks"
                  },
                  description: { type: Type.STRING, description: "Short description" }
                },
                required: ["id", "name", "duration", "predecessors"]
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const data = JSON.parse(jsonText);
    
    // Map to our Task interface
    const tasks: Task[] = data.tasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
      predecessors: t.predecessors || [],
      progress: 0,
      status: TaskStatus.TODO,
    }));

    return tasks;

  } catch (error) {
    console.error("Error generating plan:", error);
    // Fallback or rethrow
    return [];
  }
};

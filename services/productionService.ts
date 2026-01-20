
import { ProductionPart, ProductionOperation, TaskStatus, MachineType } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { PersistenceService } from './persistenceService';

const STORAGE_PARTS_KEY = 'erp_prod_parts';
const STORAGE_OPS_KEY = 'erp_prod_ops';

// --- DEMO DATA ---

const DEFAULT_PARTS: ProductionPart[] = [
    // Root Assembly
    { id: 'asm-1', name: 'Cuve Inox 5000L - Ensemble', quantity: 1, material: 'Inox 316L', type: 'MANUFACTURED', projectId: 'p1', status: TaskStatus.TODO, parentId: undefined },
    
    // Level 1 Children
    { id: 'part-1', name: 'Virole Principale', quantity: 1, material: 'Inox 316L ep 4mm', type: 'MANUFACTURED', projectId: 'p1', status: TaskStatus.IN_PROGRESS, parentId: 'asm-1' },
    { id: 'part-2', name: 'Fond GRC Supérieur', quantity: 1, material: 'Inox 316L', type: 'PURCHASED', projectId: 'p1', status: TaskStatus.DONE, parentId: 'asm-1' },
    { id: 'part-3', name: 'Fond GRC Inférieur', quantity: 1, material: 'Inox 316L', type: 'PURCHASED', projectId: 'p1', status: TaskStatus.DONE, parentId: 'asm-1' },
    { id: 'part-4', name: 'Pieds Support', quantity: 3, material: 'Inox 304L', type: 'MANUFACTURED', projectId: 'p1', status: TaskStatus.TODO, parentId: 'asm-1' },
    { id: 'part-5', name: 'Bride DN500', quantity: 1, material: 'Inox 316L', type: 'PURCHASED', projectId: 'p1', status: TaskStatus.TODO, parentId: 'asm-1' },
    
    // Level 2 Children (Sub-components of Pieds Support if we wanted deep nesting, keeping flat for simple demo)
];

const DEFAULT_OPS: ProductionOperation[] = [
    // Virole Ops
    { id: 'op-1', partId: 'part-1', order: 1, machineType: 'LASER', description: 'Découpe développé virole', estimatedTime: 45, status: TaskStatus.DONE },
    { id: 'op-2', partId: 'part-1', order: 2, machineType: 'ROULAGE', description: 'Roulage Ø1600', estimatedTime: 60, status: TaskStatus.DONE },
    { id: 'op-3', partId: 'part-1', order: 3, machineType: 'SOUDURE', description: 'Soudure longitudinale interne/externe', estimatedTime: 120, status: TaskStatus.IN_PROGRESS },
    { id: 'op-4', partId: 'part-1', order: 4, machineType: 'SOUDURE', description: 'Reprise racine & Passivation', estimatedTime: 90, status: TaskStatus.TODO },

    // Pieds Ops
    { id: 'op-5', partId: 'part-4', order: 1, machineType: 'LASER', description: 'Découpe platine et goussets', estimatedTime: 20, status: TaskStatus.TODO },
    { id: 'op-6', partId: 'part-4', order: 2, machineType: 'PLIAGE', description: 'Pliage corps du pied', estimatedTime: 15, status: TaskStatus.TODO },
    { id: 'op-7', partId: 'part-4', order: 3, machineType: 'SOUDURE', description: 'Assemblage complet pied', estimatedTime: 45, status: TaskStatus.TODO },
];

// --- LOCAL STORAGE HELPERS ---

export const ProductionService = {
    getParts: (): ProductionPart[] => {
        // Use PersistenceService to handle Date hydration for attachments
        const loaded = PersistenceService.loadProductionParts();
        if (loaded.length > 0) return loaded;
        return DEFAULT_PARTS;
    },

    saveParts: (parts: ProductionPart[]) => {
        localStorage.setItem(STORAGE_PARTS_KEY, JSON.stringify(parts));
    },

    getOperations: (): ProductionOperation[] => {
        const saved = localStorage.getItem(STORAGE_OPS_KEY);
        if (saved) {
            const ops = JSON.parse(saved);
            return ops.map((op: any) => ({
                ...op,
                deadline: op.deadline ? new Date(op.deadline) : undefined,
                comments: op.comments ? op.comments.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })) : [],
                attachments: op.attachments ? op.attachments.map((a: any) => ({ ...a, date: new Date(a.date) })) : [],
                timeLogs: op.timeLogs ? op.timeLogs.map((l: any) => ({ ...l, startDate: new Date(l.startDate), endDate: new Date(l.endDate) })) : []
            }));
        }
        return DEFAULT_OPS;
    },

    saveOperations: (ops: ProductionOperation[]) => {
        localStorage.setItem(STORAGE_OPS_KEY, JSON.stringify(ops));
    },

    // Get the full tree for a specific root or all roots
    getTree: () => {
        const parts = ProductionService.getParts();
        const roots = parts.filter(p => !p.parentId);
        
        const buildNode = (part: ProductionPart): any => {
            const children = parts.filter(p => p.parentId === part.id);
            return {
                ...part,
                children: children.map(buildNode)
            };
        };

        return roots.map(buildNode);
    },

    addPart: (part: ProductionPart) => {
        const parts = ProductionService.getParts();
        parts.push(part);
        ProductionService.saveParts(parts);
    },

    updatePart: (part: ProductionPart) => {
        const parts = ProductionService.getParts();
        const index = parts.findIndex(p => p.id === part.id);
        if (index !== -1) {
            parts[index] = part;
            ProductionService.saveParts(parts);
        }
    },

    updatePartStatus: (id: string, status: TaskStatus) => {
        const parts = ProductionService.getParts();
        const updated = parts.map(p => p.id === id ? { ...p, status } : p);
        ProductionService.saveParts(updated);
    },

    addOperation: (op: ProductionOperation) => {
        const ops = ProductionService.getOperations();
        ops.push(op);
        ProductionService.saveOperations(ops);
    },

    updateOperationStatus: (id: string, status: TaskStatus) => {
        const ops = ProductionService.getOperations();
        const updated = ops.map(o => o.id === id ? { ...o, status } : o);
        ProductionService.saveOperations(updated);
    },
    
    addAttachmentToPart: (partId: string, attachment: any) => {
        const parts = ProductionService.getParts();
        const part = parts.find(p => p.id === partId);
        if(part) {
            part.attachments = [...(part.attachments || []), attachment];
            ProductionService.saveParts(parts);
        }
    }
};

// --- AI BOM PARSING (TEXT) ---

const BOM_SYSTEM_INSTRUCTION = `
You are an expert industrial method engineer.
Your task is to analyze a raw text BOM (Bill of Materials) likely copied from Excel or a CAD software (like TopSolid).
You must structure it into a hierarchical JSON format.
- Identify "Manufactured" parts (sheet metal, welded assemblies) vs "Purchased" parts (screws, bolts, nuts, washers, wheels, handles).
- If the input implies an assembly structure (indentation, numbering like 1, 1.1, 1.1.1), preserve that hierarchy using parent IDs. 
- If no hierarchy is obvious, treat them as a flat list.
- Extract Name, Quantity, Material (if present).
`;

export const parseBOMWithAI = async (rawText: string, projectId: string): Promise<ProductionPart[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Parse this BOM data into a structured list: \n\n${rawText}`,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                systemInstruction: BOM_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        parts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    quantity: { type: Type.NUMBER },
                                    material: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['MANUFACTURED', 'PURCHASED'] },
                                    level: { type: Type.NUMBER, description: "Hierarchy level (0 for root, 1 for child...)" }
                                },
                                required: ['name', 'quantity', 'type', 'level']
                            }
                        }
                    }
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");
        const data = JSON.parse(jsonText);

        // Convert flat level-based list to ID/ParentID structure
        const resultParts: ProductionPart[] = [];
        const lastIdAtLevel: { [key: number]: string } = {};

        data.parts.forEach((p: any, index: number) => {
            const id = `part-${Date.now()}-${index}`;
            const parentId = p.level > 0 ? lastIdAtLevel[p.level - 1] : undefined;
            
            lastIdAtLevel[p.level] = id;

            resultParts.push({
                id,
                parentId: parentId || null,
                name: p.name,
                quantity: p.quantity,
                material: p.material || 'N/A',
                type: p.type as 'MANUFACTURED' | 'PURCHASED',
                projectId,
                status: TaskStatus.TODO
            });
        });

        return resultParts;

    } catch (e) {
        console.error("AI BOM Parsing Error", e);
        return [];
    }
};

// --- AI GRAPH PHASE PARSING (IMAGE) ---

const PHASE_GRAPH_SYSTEM_INSTRUCTION = `
You are an expert industrial method engineer. 
Analyze the provided image of a "Graphique de Phases" (Phase Graph) document.
This document typically contains rows representing Parts (REPÈRES) and columns representing Time/Sequence.
Rectangles in the grid represent manufacturing operations (Phases).

Your goal is to extracting the data into a JSON structure.

1. **Parts**: Identify each row as a Part. Extract its Reference/Name (usually in the first column "REPERES").
2. **Operations**: For each part, identify the sequence of operations (the boxes).
   - Read the operation code (e.g., TRA, SC, PLI, SOUD, PEINT) inside the box.
   - Use the Legend on the right (if visible) to map codes to descriptions (e.g. TRA = Traçage, PLI = Pliage).
   - Maintain the chronological order (left to right).
3. **Assembly**: If there are lines connecting different rows, it indicates an assembly relationship. Try to infer which parts are children of others. If unclear, list them as separate manufactured parts.

Map the operation codes to these machine types where possible: LASER, PLIAGE, POINCONNAGE, SOUDURE, ETUDE. If it's cutting (Scie, Cisaille), map to LASER (as generic cutting). If Assembly/Montage, map to MONTAGE. Otherwise use the code as the description.
`;

export const parsePhaseGraphWithAI = async (base64Image: string, projectId: string): Promise<{ parts: ProductionPart[], operations: ProductionOperation[] }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                { text: "Analyze this Phase Graph image and extract parts and operations." },
                { inlineData: { mimeType: 'image/png', data: base64Image } }
            ],
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                systemInstruction: PHASE_GRAPH_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    reference: { type: Type.STRING, description: "Part name/reference from the first column" },
                                    quantity: { type: Type.NUMBER, description: "Quantity if visible, else 1" },
                                    phases: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                code: { type: Type.STRING },
                                                machineType: { type: Type.STRING, enum: ['LASER', 'PLIAGE', 'POINCONNAGE', 'SOUDURE', 'ETUDE', 'MONTAGE', 'PEINTURE', 'EXPEDITION'] },
                                                description: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");
        const data = JSON.parse(jsonText);

        const resultParts: ProductionPart[] = [];
        const resultOps: ProductionOperation[] = [];

        data.items.forEach((item: any, index: number) => {
            const partId = `part-graph-${Date.now()}-${index}`;
            
            // Create Part
            resultParts.push({
                id: partId,
                parentId: null, // Graph parsing usually results in a flat list or difficult to infer tree perfectly, flat for safety
                name: item.reference || `Repère ${index+1}`,
                quantity: item.quantity || 1,
                material: 'A définir',
                type: 'MANUFACTURED',
                projectId,
                status: TaskStatus.TODO
            });

            // Create Operations
            item.phases.forEach((phase: any, pIndex: number) => {
                resultOps.push({
                    id: `op-${partId}-${pIndex}`,
                    partId: partId,
                    order: pIndex + 1,
                    machineType: phase.machineType as any,
                    description: phase.description || phase.code,
                    estimatedTime: 0, // AI doesn't guess time yet
                    status: TaskStatus.TODO
                });
            });
        });

        return { parts: resultParts, operations: resultOps };

    } catch (e) {
        console.error("AI Graph Parsing Error", e);
        return { parts: [], operations: [] };
    }
};

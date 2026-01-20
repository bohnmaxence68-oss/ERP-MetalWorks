
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Network, ListChecks, Printer, FileInput, Plus, Save, Trash2, ChevronRight, ChevronDown, CheckCircle2, Circle, Loader2, Sparkles, Box, GripVertical, Image as ImageIcon, GanttChartSquare, GitMerge, MoreVertical, X, FolderPlus, Eye, Edit3, ArrowRight, PenSquare, LayoutList, CornerDownRight, Blocks, Download, Calendar, Search, FileText, Paperclip, ExternalLink, File as FileIcon, MessageSquare, Clock, Send, Play, Square, Timer, Check, User as UserIcon, AlertTriangle, PenTool, Lock, Unlock } from 'lucide-react';
import { ProductionPart, ProductionOperation, TaskStatus, MachineType, ManufacturingPhase, AssemblyMethod, Task, Project, Attachment, TaskComment, TimeLog, User } from '../../types';
import { ProductionService, parseBOMWithAI, parsePhaseGraphWithAI } from '../../services/productionService';
import { QuoteDataService } from '../../services/quoteData';
import { GanttView } from '../Gantt/GanttView';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- STYLES CONSTANTS ---
const INPUT_CLASS = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400";
const INLINE_INPUT_CLASS = "w-full text-xs border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none py-1 bg-transparent text-slate-900 placeholder:text-slate-400";

// --- INTERACTIVE ASSEMBLY NODE (ASSEMBLY GRAPH VIEW) ---
interface AssemblyNodeProps {
    part: ProductionPart & { children?: any[] };
    isRoot?: boolean;
    assemblyMethods: AssemblyMethod[];
    isEditMode: boolean;
    onDrop: (draggedId: string, targetId: string | null) => void;
    onDelete: (id: string) => void;
}

const AssemblyNode: React.FC<AssemblyNodeProps> = ({ part, isRoot = false, assemblyMethods, isEditMode, onDrop, onDelete }) => {
    const children = part.children || [];
    const [isDragOver, setIsDragOver] = useState(false);

    // Resolve Assembly Method Name
    const method = part.assemblyMethodId ? assemblyMethods.find(m => m.id === part.assemblyMethodId) : null;

    const handleDragStart = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.dataTransfer.setData('partId', part.id);
        e.stopPropagation();
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('partId');
        if (draggedId && draggedId !== part.id) {
            onDrop(draggedId, part.id);
        }
    };

    return (
        <div className="flex items-center">
            {children.length > 0 && (
                <div className="flex flex-col gap-6 mr-8 relative">
                     {/* Connector from Vertical Spine to Parent */}
                     <div className="absolute -right-8 top-1/2 w-4 h-0.5 bg-slate-300"></div>

                     {children.map((child: any, index: number) => (
                        <div key={child.id} className="relative flex items-center justify-end">
                             <AssemblyNode part={child} assemblyMethods={assemblyMethods} isEditMode={isEditMode} onDrop={onDrop} onDelete={onDelete} />
                             
                             {/* Connector from Child to Vertical Spine */}
                             <div className="absolute -right-4 top-1/2 w-4 h-0.5 bg-slate-300"></div>
                             
                             {/* Vertical Spine Segment */}
                             {children.length > 1 && (
                                 <div className={`absolute -right-4 w-0.5 bg-slate-300 ${
                                     index === 0 ? 'top-1/2 bottom-0' : 
                                     index === children.length - 1 ? 'top-0 bottom-1/2' : 
                                     'top-0 bottom-0'
                                 }`}></div>
                             )}
                        </div>
                     ))}
                </div>
            )}

            <div 
                draggable={isEditMode}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm z-10 min-w-[220px] transition-all relative group bg-white
                    ${isRoot ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-slate-200'}
                    ${isDragOver ? 'ring-2 ring-emerald-400 border-emerald-500 scale-105' : 'hover:border-blue-400'}
                    ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
            >
                <div className={`p-2 rounded-md ${part.type === 'MANUFACTURED' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                   {part.type === 'MANUFACTURED' ? <HammerIcon size={18} className="" /> : <Box size={18} className="" />}
                </div>
                <div className="flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate max-w-[140px]" title={part.name}>{part.name}</div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500 font-medium">Qté: {part.quantity}</span>
                        {method && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1" title="Méthode d'assemblage">
                                <Blocks size={10} /> {method.name}
                            </span>
                        )}
                    </div>
                </div>
                
                {isEditMode && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(part.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all absolute -top-2 -right-2 bg-white border shadow-sm"
                        title="Détacher"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

const HammerIcon = ({size, className}: {size:number, className:string}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V7.86c0-.55-.45-1-1-1H16.4c-.84 0-1.65-.33-2.25-.93L12.9 4.68c-.6-.6-1.4-.93-2.25-.93H4.86c-.55 0-1 .45-1 1v1.36c0 .84.33 1.65.93 2.25L12 15.64"/></svg>
);

interface BOMTreeItemProps {
    part: any;
    level: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onDropPart: (draggedId: string, targetId: string | null) => void;
}

const BOMTreeItem: React.FC<BOMTreeItemProps> = ({ part, level, selectedId, onSelect, onDropPart }) => {
    const [expanded, setExpanded] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const hasChildren = part.children && part.children.length > 0;

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('partId', part.id);
        e.stopPropagation();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('partId');
        if (draggedId && draggedId !== part.id) {
            onDropPart(draggedId, part.id);
        }
    };

    return (
        <div>
            <div 
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm border border-transparent
                    ${selectedId === part.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}
                    ${isDragOver ? 'border-blue-500 bg-blue-50 shadow-inner' : ''}
                `}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onSelect(part.id)}
            >
                <div className="cursor-grab text-slate-300 hover:text-slate-500" title="Déplacer">
                    <GripVertical size={12} />
                </div>

                {hasChildren ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="p-0.5 hover:bg-slate-200 rounded"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="w-4"></span>
                )}
                
                {part.type === 'MANUFACTURED' ? <HammerIcon size={14} className={selectedId === part.id ? 'text-blue-600' : 'text-slate-400'} /> : <Box size={14} className="text-amber-500" />}
                
                <span className="truncate font-medium">{part.name}</span>
                <span className="text-xs text-slate-400 ml-auto bg-white/50 px-1.5 rounded">x{part.quantity}</span>
            </div>
            
            {hasChildren && expanded && (
                <div>
                    {part.children.map((child: any) => (
                        <BOMTreeItem 
                            key={child.id} 
                            part={child} 
                            level={level + 1} 
                            selectedId={selectedId} 
                            onSelect={onSelect} 
                            onDropPart={onDropPart}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN MODULE ---

interface ProductionModuleProps {
    forcedProjectId?: string;
    mode?: 'FULL' | 'METHODS_ONLY' | 'WORKSHOP_ONLY' | 'MANAGER';
    currentUser?: User;
    users?: User[]; // For Manager view
    onAddNotification?: (msg: string, type: 'alert' | 'warning' | 'info', projectId: string) => void;
}

export const ProductionModule: React.FC<ProductionModuleProps> = ({ forcedProjectId, mode = 'FULL', currentUser, users = [], onAddNotification }) => {
    // Internal Tabs for Methods view
    const [methodsTab, setMethodsTab] = useState<'BOM' | 'GRAPH' | 'ASSEMBLY' | 'PLANNING'>('BOM');
    
    // Data State
    const [parts, setParts] = useState<ProductionPart[]>([]);
    const [operations, setOperations] = useState<ProductionOperation[]>([]);
    const [phases, setPhases] = useState<ManufacturingPhase[]>([]);
    const [assemblyMethods, setAssemblyMethods] = useState<AssemblyMethod[]>([]);
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [bomText, setBomText] = useState('');
    const [showImport, setShowImport] = useState(false);
    
    // Manual Edit State
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<ProductionPart | null>(null);
    const [targetParentId, setTargetParentId] = useState<string | undefined>(undefined);
    
    // View/Edit Toggle States
    const [isAssemblyEditMode, setIsAssemblyEditMode] = useState(false);
    const [isMatrixEditMode, setIsMatrixEditMode] = useState(false);
    const [isPlanningEditMode, setIsPlanningEditMode] = useState(false);
    
    // Workshop View State
    const [workshopSearch, setWorkshopSearch] = useState('');
    const [viewingOpDetails, setViewingOpDetails] = useState<string | null>(null);
    const [validatingOpId, setValidatingOpId] = useState<string | null>(null);
    const [reportingPartId, setReportingPartId] = useState<string | null>(null);
    
    // Ops Dragging
    const [draggingOpId, setDraggingOpId] = useState<string | null>(null);

    // Add file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    // Refresh Trigger
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        loadData();
    }, [forcedProjectId, refreshKey]);

    const loadData = () => {
        let allParts = ProductionService.getParts();
        let allOps = ProductionService.getOperations();
        const availablePhases = QuoteDataService.getPhases();
        const availableMethods = QuoteDataService.getAssemblyMethods();

        if (forcedProjectId) {
            allParts = allParts.filter(p => p.projectId === forcedProjectId);
            const partIds = new Set(allParts.map(p => p.id));
            allOps = allOps.filter(o => partIds.has(o.partId));
        }

        setParts(allParts);
        setOperations(allOps);
        setPhases(availablePhases);
        setAssemblyMethods(availableMethods);
    };

    // --- GENERATE GANTT FROM PRODUCTION DATA ---
    const generatedGanttTasks = useMemo(() => {
        if (mode !== 'METHODS_ONLY' && methodsTab !== 'PLANNING') return [];

        const tasks: Task[] = [];
        const partToTaskIdMap = new Map<string, string>(); // Maps partId to a main task ID representing that part

        // 1. Create a Task for each Part (Summary Task)
        parts.forEach(part => {
            const taskId = `gantt-part-${part.id}`;
            tasks.push({
                id: taskId,
                name: part.name,
                duration: 0, // Calculated later
                status: part.status,
                progress: part.status === TaskStatus.DONE ? 100 : 0,
                predecessors: [],
                isCritical: false,
                slack: 0,
                quantity: part.quantity,
                material: part.material,
                // If the part is purchased, it has a duration (delivery time), if manufactured, it sums up operations
                description: `Ensemble: ${part.name}`
            });
            partToTaskIdMap.set(part.id, taskId);
        });

        // 2. Create Tasks for Operations (Subtasks visually, or linked sequentially)
        // For simplicity in this Gantt, we will list Operations as main tasks linked to their part
        
        const opsTasks: Task[] = [];
        
        parts.filter(p => p.type === 'MANUFACTURED').forEach(part => {
            const partOps = operations.filter(o => o.partId === part.id).sort((a,b) => a.order - b.order);
            let prevOpId: string | null = null;

            partOps.forEach(op => {
                const opTaskId = `gantt-op-${op.id}`;
                // Estimate: 8 hours per day. Min 0.1 days.
                const durationDays = Math.max(0.1, parseFloat((op.estimatedTime / 480).toFixed(2)));
                
                const task: Task = {
                    id: opTaskId,
                    name: `${part.name} - ${op.machineType}`,
                    duration: durationDays,
                    status: op.status,
                    progress: op.status === TaskStatus.DONE ? 100 : 0,
                    predecessors: prevOpId ? [prevOpId] : [], // Sequential ops
                    isCritical: false,
                    slack: 0,
                    description: op.description,
                    startDate: op.startDate,
                    endDate: op.endDate
                };
                opsTasks.push(task);
                prevOpId = opTaskId;
            });

            // Link the "Part Task" to start when the first op starts and end when last op ends?
            // Or just rely on Operations for the Gantt.
            // Let's rely on Ops for the Gantt for granularity.
        });

        // 3. Handle Assembly Dependencies (Parent Part depends on Child Parts)
        // This is complex. If Part A is child of Part B, Part B's ops can't start until Part A is done.
        
        // Let's create a map of Part -> Last Operation Task ID
        const partCompletionTaskId = new Map<string, string>();
        
        parts.forEach(part => {
            const partOps = operations.filter(o => o.partId === part.id).sort((a,b) => a.order - b.order);
            if (partOps.length > 0) {
                partCompletionTaskId.set(part.id, `gantt-op-${partOps[partOps.length-1].id}`);
            } else {
                // If purchased or no ops, the "part task" itself is the node (or we assume a delivery task)
                // For now, ignore purely purchased parts in dependencies unless they have a "Reception" op
            }
        });

        // Add dependencies: Child Part Completion -> Parent Part First Op
        parts.forEach(childPart => {
            if (childPart.parentId) {
                const parentPart = parts.find(p => p.id === childPart.parentId);
                if (parentPart) {
                    const parentFirstOp = operations.filter(o => o.partId === parentPart.id).sort((a,b) => a.order - b.order)[0];
                    const childLastOpId = partCompletionTaskId.get(childPart.id);
                    
                    if (parentFirstOp && childLastOpId) {
                        const parentOpTaskId = `gantt-op-${parentFirstOp.id}`;
                        const task = opsTasks.find(t => t.id === parentOpTaskId);
                        if (task && !task.predecessors.includes(childLastOpId)) {
                            task.predecessors.push(childLastOpId);
                        }
                    }
                }
            }
        });

        return opsTasks;
    }, [parts, operations, methodsTab, mode]);

    // Update Project/Production Data when Gantt changes
    const handleProductionGanttUpdate = (project: Project) => {
        // We receive updated Tasks (with new dates). We need to map them back to Operations.
        const updatedOps = [...operations];
        let hasChanges = false;

        project.tasks.forEach(task => {
            if (task.id.startsWith('gantt-op-')) {
                const opId = task.id.replace('gantt-op-', '');
                const opIndex = updatedOps.findIndex(o => o.id === opId);
                
                if (opIndex >= 0) {
                    const original = updatedOps[opIndex];
                    // Check for changes (dates or status)
                    if (
                        JSON.stringify(original.startDate) !== JSON.stringify(task.startDate) ||
                        JSON.stringify(original.endDate) !== JSON.stringify(task.endDate)
                    ) {
                        updatedOps[opIndex] = {
                            ...original,
                            startDate: task.startDate,
                            endDate: task.endDate
                        };
                        hasChanges = true;
                    }
                }
            }
        });

        if (hasChanges) {
            ProductionService.saveOperations(updatedOps);
            setRefreshKey(prev => prev + 1);
        }
    };

    // --- COMPUTED DATA & HANDLERS ---
    const treeData = React.useMemo(() => {
        const projectParts = forcedProjectId ? parts.filter(p => p.projectId === forcedProjectId) : parts;
        const roots = projectParts.filter(p => !p.parentId);
        
        const buildNode = (part: ProductionPart): any => {
            const children = projectParts.filter(p => p.parentId === part.id);
            return {
                ...part,
                children: children.map(buildNode)
            };
        };

        return roots.map(buildNode);
    }, [parts, forcedProjectId]);

    const selectedPart = selectedPartId ? parts.find(p => p.id === selectedPartId) : null;
    const selectedOps = selectedPartId ? operations.filter(o => o.partId === selectedPartId).sort((a, b) => a.order - b.order) : [];
    const selectedMethod = selectedPart?.assemblyMethodId ? assemblyMethods.find(m => m.id === selectedPart.assemblyMethodId) : null;

    const handleValidateOperation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatingOpId) return;
        
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const startStr = formData.get('startDateTime') as string;
        const endStr = formData.get('endDateTime') as string;
        
        // Calculate duration if possible
        let durationMinutes = 0;
        let startDateObj = new Date();
        let endDateObj = new Date();

        if(startStr && endStr) {
            startDateObj = new Date(startStr);
            endDateObj = new Date(endStr);
            
            const diffMs = endDateObj.getTime() - startDateObj.getTime();
            durationMinutes = Math.round(diffMs / 60000);
            if (durationMinutes < 0) durationMinutes = 0;
        }

        // Add TimeLog
        const op = operations.find(o => o.id === validatingOpId);
        if (op) {
            const newLog: TimeLog = {
                id: `log-${Date.now()}`,
                userId: currentUser?.id || 'worker',
                userName: currentUser?.name || 'Atelier',
                startDate: startDateObj,
                endDate: endDateObj, 
                durationMinutes: durationMinutes > 0 ? durationMinutes : (op.estimatedTime || 30),
                comment: 'Validation Atelier'
            };
            const updatedOp = { 
                ...op, 
                status: TaskStatus.DONE, 
                timeLogs: [...(op.timeLogs || []), newLog] 
            };
            
            // Persist Update
            const allOps = ProductionService.getOperations();
            const idx = allOps.findIndex(o => o.id === op.id);
            if (idx !== -1) {
                allOps[idx] = updatedOp;
                ProductionService.saveOperations(allOps);
            }
        }

        setRefreshKey(prev => prev + 1);
        setValidatingOpId(null);
        if (onAddNotification && forcedProjectId) {
             onAddNotification("Opération validée en atelier", "info", forcedProjectId);
        }
    };

    const handleSendReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportingPartId) return;
        
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const text = formData.get('comment') as string;
        
        const part = parts.find(p => p.id === reportingPartId);
        if (part) {
            const newComment: TaskComment = {
                id: `rep-${Date.now()}`,
                userId: currentUser?.id || 'unknown',
                userName: currentUser?.name || 'Atelier',
                text: `[SIGNALEMENT] ${text}`,
                createdAt: new Date()
            };
            const updatedPart = { ...part, comments: [...(part.comments || []), newComment] };
            ProductionService.updatePart(updatedPart);
            setRefreshKey(prev => prev + 1);
        }

        setReportingPartId(null);
        if (onAddNotification && forcedProjectId) {
             onAddNotification("Signalement reçu de l'atelier", "warning", forcedProjectId);
        }
    };

    const handleExportPDF = async (elementId: string, filename: string) => {
        const input = document.getElementById(elementId);
        if (!input) return;
        try {
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const width = pdf.internal.pageSize.getWidth();
            const height = (canvas.height * width) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`${filename}.pdf`);
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    const openEditPartModal = (part: ProductionPart) => {
        setEditingPart(part);
        setTargetParentId(undefined);
        setIsPartModalOpen(true);
    };

    const openAddPartModal = (parentId?: string) => {
        setEditingPart(null);
        setTargetParentId(parentId);
        setIsPartModalOpen(true);
    };

    const handleSavePart = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        
        const newPart: ProductionPart = {
            id: editingPart ? editingPart.id : `part-${Date.now()}`,
            name: formData.get('name') as string,
            quantity: Number(formData.get('quantity')),
            type: formData.get('type') as any,
            material: formData.get('material') as string,
            projectId: forcedProjectId || 'p1',
            parentId: editingPart ? editingPart.parentId : (targetParentId || undefined),
            status: editingPart ? editingPart.status : TaskStatus.TODO,
            assemblyMethodId: formData.get('assemblyMethodId') as string || undefined,
            comments: editingPart?.comments || [],
            attachments: editingPart?.attachments || [],
            description: editingPart?.description || '' // Preserve description if not in form (handled separately or add form field)
        };
        
        // If Description is in form (it should be for new items)
        const descInput = formData.get('description');
        if(descInput) newPart.description = descInput.toString();

        if (editingPart) {
            ProductionService.updatePart(newPart);
        } else {
            ProductionService.addPart(newPart);
        }
        setRefreshKey(prev => prev + 1);
        setIsPartModalOpen(false);
    };

    const handleDeletePart = (id: string) => {
        if (confirm("Supprimer cet élément et ses sous-éléments ?")) {
            const currentParts = ProductionService.getParts();
            const remaining = currentParts.filter(p => p.id !== id && p.parentId !== id);
            ProductionService.saveParts(remaining);
            setRefreshKey(prev => prev + 1);
            if (selectedPartId === id) setSelectedPartId(null);
        }
    };

    const handleDropPart = (draggedId: string, targetId: string | null) => {
        if (draggedId === targetId) return;
        
        // Prevent Circular Loop
        let currentParent = targetId;
        const allParts = ProductionService.getParts();
        while (currentParent) {
            if (currentParent === draggedId) {
                alert("Impossible : Vous ne pouvez pas déplacer un parent dans son enfant.");
                return;
            }
            const parent = allParts.find(p => p.id === currentParent);
            currentParent = parent?.parentId || null;
        }

        const part = parts.find(p => p.id === draggedId);
        if (part) {
            const updated = { ...part, parentId: targetId || undefined };
            ProductionService.updatePart(updated);
            setRefreshKey(prev => prev + 1);
        }
    };

    const toggleOperation = (partId: string, machineTypeId: string) => {
        if (!isMatrixEditMode) return; // Only allow toggling in Edit Mode
        const existing = operations.find(o => o.partId === partId && o.machineType === machineTypeId);
        if (existing) {
            const newOps = operations.filter(o => o.id !== existing.id);
            ProductionService.saveOperations(newOps);
        } else {
            const newOp: ProductionOperation = {
                id: `op-${Date.now()}`,
                partId,
                order: operations.filter(o => o.partId === partId).length + 1,
                machineType: machineTypeId as any,
                description: phases.find(p => p.id === machineTypeId)?.name || machineTypeId,
                estimatedTime: 0,
                status: TaskStatus.TODO
            };
            ProductionService.addOperation(newOp);
        }
        setRefreshKey(prev => prev + 1);
    };

    const addOperation = () => {
        if (!selectedPartId) return;
        const newOp: ProductionOperation = {
            id: `op-${Date.now()}`,
            partId: selectedPartId,
            order: selectedOps.length + 1,
            machineType: 'LASER',
            description: 'Nouvelle opération',
            estimatedTime: 0,
            status: TaskStatus.TODO
        };
        ProductionService.addOperation(newOp);
        setRefreshKey(prev => prev + 1);
    };

    const updateOperation = (id: string, field: keyof ProductionOperation, value: any) => {
        const op = operations.find(o => o.id === id);
        if (op) {
            const updated = { ...op, [field]: value };
            const allOps = ProductionService.getOperations();
            const index = allOps.findIndex(o => o.id === id);
            if (index >= 0) {
                allOps[index] = updated;
                ProductionService.saveOperations(allOps);
                setRefreshKey(prev => prev + 1);
            }
        }
    };

    const deleteOperation = (id: string) => {
        const allOps = ProductionService.getOperations();
        const filtered = allOps.filter(o => o.id !== id);
        ProductionService.saveOperations(filtered);
        setRefreshKey(prev => prev + 1);
    };

    // --- OPERATION DRAG & DROP HANDLERS ---
    const handleOpDragStart = (e: React.DragEvent, id: string) => {
        setDraggingOpId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleOpDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleOpDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggingOpId || draggingOpId === targetId) return;

        // Reorder selectedOps based on drop
        const currentIndex = selectedOps.findIndex(o => o.id === draggingOpId);
        const targetIndex = selectedOps.findIndex(o => o.id === targetId);
        
        if (currentIndex === -1 || targetIndex === -1) return;

        const newOrderOps = [...selectedOps];
        const [movedOp] = newOrderOps.splice(currentIndex, 1);
        newOrderOps.splice(targetIndex, 0, movedOp);

        // Update 'order' field for all affected ops
        const allOps = ProductionService.getOperations();
        newOrderOps.forEach((op, idx) => {
            const globalIndex = allOps.findIndex(o => o.id === op.id);
            if (globalIndex !== -1) {
                allOps[globalIndex].order = idx + 1;
            }
        });

        ProductionService.saveOperations(allOps);
        setRefreshKey(prev => prev + 1);
        setDraggingOpId(null);
    };

    const handleUpdateOpDetails = (opId: string, field: keyof ProductionOperation, value: any) => {
        const op = operations.find(o => o.id === opId);
        if (!op) return;

        let updatedValue = value;
        if (field === 'attachments') {
            updatedValue = [...(op.attachments || []), value];
        } else if (field === 'comments') {
            updatedValue = [...(op.comments || []), value];
        }

        updateOperation(opId, field, updatedValue);
    };

    const handleGenerateLabel = () => {
        if (!selectedPart) return;
        
        // 1. Get Operations associated with this part
        const partOps = operations.filter(o => o.partId === selectedPart.id).sort((a, b) => a.order - b.order);

        // 2. Initialize PDF (A5 Landscape: 210mm x 148mm)
        const doc = new jsPDF({ orientation: 'landscape', format: 'a5', unit: 'mm' });
        
        // --- DRAWING THE "FICHE SUIVEUSE" ---

        // Border around the whole sheet
        doc.setLineWidth(0.5);
        doc.setDrawColor(0);
        doc.rect(5, 5, 200, 138); 

        // -- HEADER --
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("FICHE SUIVEUSE", 105, 15, { align: "center" });

        // Part Info Box
        doc.rect(10, 20, 190, 25);
        
        // Part Name
        doc.setFontSize(14);
        doc.text(`Pièce: ${selectedPart.name}`, 15, 30);
        
        // Sub Info
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        // Ref (ID)
        doc.text(`Ref: ${selectedPart.id}`, 15, 40);
        // Material
        doc.text(`Matière: ${selectedPart.material}`, 90, 40);
        // Quantity
        doc.text(`Quantité: ${selectedPart.quantity}`, 160, 40);

        // -- TABLE HEADER --
        let y = 55;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setFillColor(230, 230, 230);
        doc.rect(10, 50, 190, 8, 'F'); // Header Background
        
        doc.text("#", 12, y);
        doc.text("Phase / Machine", 25, y);
        doc.text("Instructions", 75, y);
        doc.text("Visa / Contrôle", 165, y);

        // -- TABLE ROWS (OPERATIONS) --
        doc.setFont("helvetica", "normal");
        y += 8; // Start below header

        if (partOps.length === 0) {
            doc.text("Aucune opération définie.", 15, y + 5);
        } else {
            partOps.forEach((op, index) => {
                const rowHeight = 12;
                
                // Draw row bottom line
                doc.setDrawColor(200);
                doc.line(10, y + rowHeight, 200, y + rowHeight);
                doc.setDrawColor(0); // Reset color

                // Order
                doc.text(`${index + 1}`, 12, y + 5);
                
                // Machine Type
                doc.text(op.machineType, 25, y + 5);
                
                // Description (Truncate if needed)
                const maxDescLen = 50;
                const desc = op.description.length > maxDescLen ? op.description.substring(0, maxDescLen) + "..." : op.description;
                doc.text(desc, 75, y + 5);

                // Visa Box (Empty square for checking)
                doc.rect(170, y + 2, 25, 8);

                y += rowHeight;
            });
        }

        // Open PDF
        window.open(doc.output('bloburl'), '_blank');
    };

    const handleBOMImport = async () => {
        if (!bomText || !forcedProjectId) return;
        setLoadingAI(true);
        try {
            const parsedParts = await parseBOMWithAI(bomText, forcedProjectId);
            const currentParts = ProductionService.getParts();
            ProductionService.saveParts([...currentParts, ...parsedParts]);
            setRefreshKey(prev => prev + 1);
            setShowImport(false);
            setBomText('');
        } catch (e) {
            alert("Erreur lors de l'import");
        } finally {
            setLoadingAI(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !forcedProjectId) return;
        setLoadingAI(true);
        try {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const result = await parsePhaseGraphWithAI(base64, forcedProjectId);
                
                const currentParts = ProductionService.getParts();
                const currentOps = ProductionService.getOperations();
                
                ProductionService.saveParts([...currentParts, ...result.parts]);
                ProductionService.saveOperations([...currentOps, ...result.operations]);
                
                setRefreshKey(prev => prev + 1);
                setShowImport(false);
            };
        } catch (e) {
            alert("Erreur analyse image");
        } finally {
            setLoadingAI(false);
        }
    };

    const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files?.[0] && editingPart) {
            const file = e.target.files[0];
            const newAtt: Attachment = {
                id: `att-part-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file), // In real app, upload to server
                type: 'FILE',
                addedBy: currentUser?.name || 'User',
                date: new Date()
            };
            const updatedPart = { ...editingPart, attachments: [...(editingPart.attachments || []), newAtt] };
            setEditingPart(updatedPart);
        }
    };

    // --- RENDER MANAGER VIEW ---
    if (mode === 'MANAGER') {
        const totalOps = operations.length;
        const doneOps = operations.filter(o => o.status === TaskStatus.DONE).length;
        const progress = totalOps > 0 ? Math.round((doneOps / totalOps) * 100) : 0;
        
        const allLogs = operations.flatMap(op => {
            const part = parts.find(p => p.id === op.partId);
            return (op.timeLogs || []).map(log => ({
                ...log,
                opName: op.machineType,
                partName: part?.name || 'Inconnu',
                opDescription: op.description
            }));
        }).sort((a,b) => b.startDate.getTime() - a.startDate.getTime());

        return (
            <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
                <div className="bg-white p-6 border-b border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <ListChecks className="text-blue-600" />
                            Tableau de Bord Chef d'Atelier
                        </h1>
                        <p className="text-slate-500">Suivi de production et performance</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-500 uppercase">Avancement Global</p>
                        <p className="text-3xl font-bold text-slate-800">{progress}%</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Opérations Restantes</p>
                            <p className="text-2xl font-bold text-slate-800">{totalOps - doneOps} <span className="text-sm font-normal text-slate-400">/ {totalOps}</span></p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Heures Produites (Total)</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {Math.round(allLogs.reduce((acc, l) => acc + l.durationMinutes, 0) / 60)}h
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Dernière Activité</p>
                            <p className="text-lg font-bold text-slate-800">
                                {allLogs.length > 0 ? allLogs[0].userName : '-'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {allLogs.length > 0 ? new Date(allLogs[0].endDate).toLocaleString() : ''}
                            </p>
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock size={18}/> Journal de Production</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Opérateur</th>
                                    <th className="px-6 py-4">Pièce</th>
                                    <th className="px-6 py-4">Opération</th>
                                    <th className="px-6 py-4">Début</th>
                                    <th className="px-6 py-4">Fin</th>
                                    <th className="px-6 py-4 text-right">Durée</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">{log.userName.substring(0,2)}</div>
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 font-medium">{log.partName}</td>
                                        <td className="px-6 py-3 text-slate-500">
                                            <span className="font-bold text-slate-700">{log.opName}</span> - {log.opDescription}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">{new Date(log.startDate).toLocaleTimeString()}</td>
                                        <td className="px-6 py-3 text-slate-500">{new Date(log.endDate).toLocaleTimeString()}</td>
                                        <td className="px-6 py-3 text-right font-mono font-bold text-slate-700">{log.durationMinutes} min</td>
                                    </tr>
                                ))}
                                {allLogs.length === 0 && (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Aucune activité enregistrée.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- WORKSHOP UI ---
    if (mode === 'WORKSHOP_ONLY') {
        let workQueue = parts.filter(p => p.type === 'MANUFACTURED');
        if (workshopSearch) {
            const searchLower = workshopSearch.toLowerCase();
            workQueue = workQueue.filter(p => p.name.toLowerCase().includes(searchLower) || p.material.toLowerCase().includes(searchLower));
        }

        const detailedOp = operations.find(o => o.id === viewingOpDetails);

        return (
            <div className="h-full flex flex-col bg-slate-100 relative">
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
                    <h2 className="text-xl font-bold flex items-center gap-2"><ListChecks /> Atelier - Suivi & Plans</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                                className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none w-64 placeholder:text-slate-500" 
                                placeholder="Rechercher / Scanner pièce..."
                                value={workshopSearch}
                                onChange={(e) => setWorkshopSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workQueue.map(part => {
                        const partOps = operations.filter(o => o.partId === part.id).sort((a, b) => a.order - b.order);
                        const progress = partOps.length > 0 
                            ? Math.round((partOps.filter(o => o.status === TaskStatus.DONE).length / partOps.length) * 100) 
                            : 0;

                        return (
                            <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group h-full">
                                <button 
                                    onClick={() => setReportingPartId(part.id)}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors z-10"
                                    title="Signaler un problème / Commentaire"
                                >
                                    <AlertTriangle size={20} />
                                </button>

                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                                    <div className="pr-12">
                                        <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1 truncate">{part.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono">{part.material} • Qté: {part.quantity}</p>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Description / Instructions - Scrollable area to save space */}
                                    {part.description && (
                                        <div className="mb-4 bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-sm text-slate-700 max-h-32 overflow-y-auto">
                                            <h5 className="font-bold text-xs text-yellow-800 uppercase mb-1 flex items-center gap-1 sticky top-0 bg-yellow-50"><FileText size={12}/> Instructions</h5>
                                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: part.description }}></div>
                                        </div>
                                    )}

                                    {/* Attachments / Plans */}
                                    {part.attachments && part.attachments.length > 0 && (
                                        <div className="mb-4 flex flex-wrap gap-2">
                                            {part.attachments.map((att, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={att.url} 
                                                    target="_blank" 
                                                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-2 py-1.5 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors text-xs font-medium truncate max-w-full"
                                                >
                                                    <Paperclip size={14} /> {att.name} <ExternalLink size={10} />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    <div className="w-full bg-slate-200 h-1.5 rounded-full mb-4 overflow-hidden">
                                        <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    
                                    {/* Operations List */}
                                    <div className="space-y-2 mt-auto">
                                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gammes</h5>
                                        {partOps.map(op => (
                                            <div 
                                                key={op.id} 
                                                className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${
                                                    op.status === TaskStatus.DONE ? 'bg-green-50 border-green-200 opacity-70' : 'bg-white border-slate-200 hover:border-blue-400'
                                                }`}
                                            >
                                                {/* Validate Button - TRIGGERS MODAL NOW */}
                                                <button 
                                                    onClick={() => op.status !== TaskStatus.DONE && setValidatingOpId(op.id)}
                                                    className={`p-1 rounded-full transition-colors flex-shrink-0 ${op.status === TaskStatus.DONE ? 'text-green-600 cursor-default' : 'text-slate-300 hover:text-blue-600'}`}
                                                    disabled={op.status === TaskStatus.DONE}
                                                >
                                                    {op.status === TaskStatus.DONE ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </button>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-bold text-xs text-slate-700 truncate">{op.machineType}</p>
                                                        {op.status === TaskStatus.DONE && <span className="text-[10px] bg-green-200 text-green-800 px-1 rounded">Fait</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate" title={op.description}>{op.description}</p>
                                                </div>
                                                
                                                {/* Open Docs / Details (Read Only) */}
                                                <button 
                                                    onClick={() => setViewingOpDetails(op.id)}
                                                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${op.attachments && op.attachments.length > 0 ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-slate-300 hover:bg-slate-100'}`}
                                                    title="Détails"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {partOps.length === 0 && <p className="text-center text-slate-400 text-xs italic py-2">Aucune opération.</p>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {workQueue.length === 0 && <div className="text-center py-12 text-slate-400 col-span-full">Aucune pièce trouvée pour cette recherche.</div>}
                </div>

                {/* --- OPERATION DETAILS MODAL (READ ONLY / WORKSHOP) --- */}
                {viewingOpDetails && detailedOp && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ListChecks /> {detailedOp.machineType}</h3>
                                    <p className="text-xs text-slate-500">{detailedOp.description}</p>
                                </div>
                                <button onClick={() => setViewingOpDetails(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Attachments (Read Only) */}
                                <div>
                                    <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Paperclip size={16}/> Plans & Fichiers</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        {detailedOp.attachments?.map((att, idx) => (
                                            <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2 hover:bg-blue-50 transition-colors">
                                                <div className="text-blue-500"><FileIcon size={24} /></div>
                                                <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate font-medium">{att.name}</a>
                                                <ExternalLink size={14} className="text-slate-400" />
                                            </div>
                                        ))}
                                        {(!detailedOp.attachments || detailedOp.attachments.length === 0) && <p className="col-span-2 text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg">Aucun document joint.</p>}
                                    </div>
                                </div>
                                {/* Comments (Read Only) */}
                                <div>
                                    <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Instructions & Notes</h4>
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 min-h-[100px] max-h-[200px] overflow-y-auto space-y-3">
                                        {detailedOp.comments?.map((comment) => (
                                            <div key={comment.id} className="bg-white p-2 rounded border border-slate-100 shadow-sm text-sm">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-bold text-slate-700 text-xs">{comment.userName}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-slate-600">{comment.text}</p>
                                            </div>
                                        ))}
                                        {(!detailedOp.comments || detailedOp.comments.length === 0) && <p className="text-xs text-slate-400 italic text-center py-4">Aucune instruction particulière.</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                                <button onClick={() => setViewingOpDetails(null)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Fermer</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- VALIDATION MODAL (FULL DATE/TIME) --- */}
                {validatingOpId && (
                    <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-4 border-b border-slate-200 bg-emerald-50 flex items-center gap-2">
                                <CheckCircle2 className="text-emerald-600" />
                                <h3 className="font-bold text-lg text-slate-800">Valider la production</h3>
                            </div>
                            <form onSubmit={handleValidateOperation} className="p-6 space-y-4">
                                <p className="text-sm text-slate-600 mb-4">Confirmez les périodes exactes de réalisation.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date & Heure de Début</label>
                                        <input 
                                            type="datetime-local" 
                                            name="startDateTime" 
                                            required 
                                            className={INPUT_CLASS}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date & Heure de Fin</label>
                                        <input 
                                            type="datetime-local" 
                                            name="endDateTime" 
                                            required 
                                            defaultValue={new Date().toISOString().slice(0, 16)} // Current time default
                                            className={INPUT_CLASS}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setValidatingOpId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm">Valider & Terminer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- REPORT / COMMENT MODAL --- */}
                {reportingPartId && (
                    <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-4 border-b border-slate-200 bg-red-50 flex items-center gap-2">
                                <AlertTriangle className="text-red-600" />
                                <h3 className="font-bold text-lg text-slate-800">Signalement / Commentaire</h3>
                            </div>
                            <form onSubmit={handleSendReport} className="p-6 space-y-4">
                                <p className="text-sm text-slate-600">Ce message sera envoyé immédiatement aux responsables.</p>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                                    <textarea 
                                        name="comment" 
                                        required 
                                        className={`${INPUT_CLASS} h-32 resize-none`}
                                        placeholder="Décrivez le problème ou l'observation..."
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-4">
                                    <button type="button" onClick={() => setReportingPartId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                    <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm flex items-center gap-2"><Send size={16} /> Envoyer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- METHODS UI (Split View: Tree/Graph + Details) ---
    return (
        <div className="h-full flex flex-col relative">
            <div className="flex justify-between items-center h-14 border-b border-slate-200 px-6 bg-white shrink-0">
                <div>
                    {!forcedProjectId && (
                        <>
                            <h1 className="text-xl font-bold text-slate-800">Méthodes</h1>
                        </>
                    )}
                </div>
                {/* Compact Top Navigation Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setMethodsTab('BOM')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${methodsTab === 'BOM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <LayoutList size={14} /> Structure
                    </button>
                    <button 
                        onClick={() => setMethodsTab('ASSEMBLY')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${methodsTab === 'ASSEMBLY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Network size={14} /> Assemblage
                    </button>
                    <button 
                        onClick={() => setMethodsTab('GRAPH')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${methodsTab === 'GRAPH' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <GanttChartSquare size={14} /> Gammes
                    </button>
                    <button 
                        onClick={() => setMethodsTab('PLANNING')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${methodsTab === 'PLANNING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                        <Calendar size={14} /> Planning
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
                
                {/* --- PLANNING TAB --- */}
                {methodsTab === 'PLANNING' && (
                    <div className="flex-1 flex flex-col min-h-0 bg-white">
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Calendar size={16} /> Ordonnancement Automatique</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsPlanningEditMode(!isPlanningEditMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isPlanningEditMode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {isPlanningEditMode ? <Unlock size={12}/> : <Lock size={12}/>}
                                    {isPlanningEditMode ? 'Édition' : 'Lecture'}
                                </button>
                                <button className="text-xs text-blue-600 hover:underline font-medium">Recalculer</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <GanttView 
                                project={{ id: forcedProjectId || 'temp', name: 'Planning Fabrication', startDate: new Date(), tasks: generatedGanttTasks }}
                                users={users || []}
                                onProjectUpdate={handleProductionGanttUpdate}
                                customTasks={generatedGanttTasks}
                                readOnly={!isPlanningEditMode}
                                allowExecution={false}
                                title=" "
                            />
                        </div>
                    </div>
                )}

                {/* --- ASSEMBLY GRAPH TAB --- */}
                {methodsTab === 'ASSEMBLY' && (
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative overflow-hidden">
                        <div className="p-3 border-b border-slate-200 bg-white flex justify-between items-center z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2"><Network size={16} /> Graphique d'Assemblage</h3>
                                <button 
                                    onClick={() => setIsAssemblyEditMode(!isAssemblyEditMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isAssemblyEditMode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                    {isAssemblyEditMode ? <Unlock size={12}/> : <Lock size={12}/>}
                                    {isAssemblyEditMode ? 'Édition' : 'Lecture'}
                                </button>
                            </div>
                            <button onClick={() => handleExportPDF('assembly-graph-container', 'Assemblage')} className="text-xs text-slate-600 hover:text-blue-600 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded"><Download size={14}/> PDF</button>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-8 flex items-center justify-center min-w-full" id="assembly-graph-container">
                            {/* Draggable Graph Container */}
                            <div 
                                className="min-w-max min-h-full flex flex-col items-center justify-center p-8"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const draggedId = e.dataTransfer.getData('partId');
                                    if (draggedId) handleDropPart(draggedId, null);
                                }}
                            >
                                {treeData.length === 0 ? (
                                    <div className="text-center text-slate-400">Aucune donnée. Veuillez créer des pièces dans la structure.</div>
                                ) : (
                                    treeData.map((part: any) => (
                                        <div key={part.id} className="mb-8">
                                            <AssemblyNode 
                                                part={part} 
                                                isRoot={true} 
                                                assemblyMethods={assemblyMethods} 
                                                isEditMode={isAssemblyEditMode} 
                                                onDrop={handleDropPart} 
                                                onDelete={handleDeletePart} 
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BOM & MATRIX (SHARED LAYOUT) --- */}
                {(methodsTab === 'BOM' || methodsTab === 'GRAPH') && (
                    <div className="flex-1 flex gap-0 overflow-hidden h-full">
                        {/* LEFT: Structure/Matrix */}
                        <div className={`bg-white border-r border-slate-200 flex flex-col overflow-hidden ${methodsTab === 'GRAPH' ? 'w-full' : 'w-1/3 min-w-[350px]'}`}>
                            <div className="p-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                                <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                    {methodsTab === 'GRAPH' ? <><GanttChartSquare size={16}/> Matrice des Gammes</> : <><LayoutList size={16}/> Structure</>}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {methodsTab === 'GRAPH' && (
                                        <>
                                            <button 
                                                onClick={() => setIsMatrixEditMode(!isMatrixEditMode)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isMatrixEditMode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {isMatrixEditMode ? <Unlock size={12}/> : <Lock size={12}/>}
                                                {isMatrixEditMode ? 'Édition' : 'Lecture'}
                                            </button>
                                            <button onClick={() => handleExportPDF('phase-graph-container', 'Graphique')} className="text-xs text-slate-600 hover:text-blue-600 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded"><Download size={14}/> PDF</button>
                                        </>
                                    )}
                                    {forcedProjectId && methodsTab !== 'GRAPH' && (
                                        <>
                                            <button onClick={() => openAddPartModal()} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-100 flex items-center gap-1 border border-emerald-100 font-medium" title="Ajouter Manuellement"><Plus size={14} /></button>
                                            <button onClick={() => setShowImport(true)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 border border-blue-100 font-medium"><Sparkles size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Import Modal */}
                            {showImport && (
                                <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
                                    <h4 className="text-sm font-bold text-blue-900 mb-3">Importer des données</h4>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Option A: Collez votre BOM texte</label>
                                        <textarea className={`h-20 mb-2 text-xs ${INPUT_CLASS}`} placeholder="Ex: \n1. Ensemble A \n 1.1 Sous-ensemble B" value={bomText} onChange={e => setBomText(e.target.value)} />
                                        <button onClick={handleBOMImport} disabled={loadingAI || !bomText} className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1 disabled:opacity-50">{loadingAI ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3" />} Analyser le Texte</button>
                                    </div>
                                    <div className="border-t border-blue-200 my-3"></div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-800 mb-1">Option B: Scan "Graphique de Phases"</label>
                                        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" id="graph-upload" />
                                        <label htmlFor="graph-upload" className={`w-full px-3 py-2 border-2 border-dashed border-blue-300 rounded bg-blue-50 hover:bg-blue-100 cursor-pointer flex items-center justify-center gap-2 text-xs text-blue-700 font-medium transition-colors ${loadingAI ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {loadingAI ? <Loader2 className="animate-spin w-4 h-4" /> : <ImageIcon className="w-4 h-4" />} {loadingAI ? 'Analyse de l\'image...' : 'Choisir une image / Scan'}
                                        </label>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4"><button onClick={() => setShowImport(false)} className="px-3 py-1 text-xs text-slate-500 hover:bg-white rounded">Fermer</button></div>
                                </div>
                            )}

                            <div 
                                className="flex-1 overflow-y-auto p-0 relative min-h-0"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const draggedId = e.dataTransfer.getData('partId');
                                    if (draggedId) handleDropPart(draggedId, null);
                                }}
                            >
                                {methodsTab === 'GRAPH' ? (
                                    <div className="h-full w-full flex flex-col" id="phase-graph-container">
                                        {/* Matrix View */}
                                        <div className="flex-1 overflow-auto bg-white relative">
                                            <div className="flex bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider sticky top-0 z-20 min-w-max">
                                                <div className="w-64 p-3 border-r border-slate-200 shrink-0 sticky left-0 bg-slate-50 z-30">REPÈRES</div>
                                                {phases.map((phase, idx) => (
                                                    <div key={phase.id} className="w-24 p-3 text-center border-r border-slate-200 shrink-0" title={phase.name}>
                                                        {isMatrixEditMode ? phase.code : (idx + 1)}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="divide-y divide-slate-100 min-w-max">
                                                {parts.filter(p => p.type === 'MANUFACTURED').map(part => {
                                                    // Logic to hide empty rows in View Mode
                                                    const hasOps = operations.some(o => o.partId === part.id);
                                                    if (!isMatrixEditMode && !hasOps) return null;

                                                    return (
                                                        <div key={part.id} className="flex hover:bg-slate-50 group">
                                                            <div onClick={() => setSelectedPartId(part.id)} className={`w-64 p-3 border-r border-slate-200 shrink-0 font-medium text-xs sticky left-0 z-20 cursor-pointer transition-colors ${selectedPartId === part.id ? 'bg-blue-50 text-blue-700 border-r-blue-200' : 'bg-white text-slate-800'}`}>
                                                                <div className="truncate font-bold">{part.name}</div>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">{part.material} (x{part.quantity})</div>
                                                            </div>
                                                            {phases.map(phase => {
                                                                const op = operations.find(o => o.partId === part.id && o.machineType === phase.id);
                                                                const hasOp = !!op;
                                                                return (
                                                                    <div 
                                                                        key={phase.id} 
                                                                        onClick={() => toggleOperation(part.id, phase.id)}
                                                                        className={`w-24 p-1 border-r border-slate-100 shrink-0 cursor-pointer flex items-center justify-center hover:bg-blue-50 relative ${!isMatrixEditMode ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50'}`}
                                                                    >
                                                                        {hasOp && (
                                                                            isMatrixEditMode ? (
                                                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm hover:scale-110 transition-transform">
                                                                                    {op.order}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-16 h-8 bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center text-[10px] font-bold shadow-sm uppercase">
                                                                                    {phase.code}
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Tree View */
                                    <div className="p-2">
                                        {treeData.length === 0 ? (
                                            <div className="text-center p-8 text-slate-400 text-sm">{forcedProjectId ? 'Aucune donnée. Ajoutez une pièce.' : 'Sélectionnez un projet.'}</div>
                                        ) : (
                                            treeData.map((part: any) => (
                                                <BOMTreeItem 
                                                    key={part.id} 
                                                    part={part} 
                                                    level={0} 
                                                    selectedId={selectedPartId} 
                                                    onSelect={setSelectedPartId} 
                                                    onDropPart={handleDropPart}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Details View (Hidden in Graph Mode) */}
                        {methodsTab !== 'GRAPH' && (
                            <div className="flex-1 bg-white rounded-none shadow-none flex flex-col overflow-hidden">
                                {selectedPart ? (
                                    <>
                                        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/30 h-14 shrink-0">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedPart.type === 'MANUFACTURED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{selectedPart.type === 'MANUFACTURED' ? 'FABRIQUÉ' : 'ACHAT'}</span>
                                                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate max-w-[200px]">
                                                        {selectedPart.name}
                                                        <button onClick={() => openEditPartModal(selectedPart)} className="text-slate-400 hover:text-blue-600 transition-colors"><PenSquare size={14}/></button>
                                                    </h2>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openAddPartModal(selectedPart.id)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 shadow-sm text-xs font-medium" title="Ajouter un sous-composant"><LayoutList size={14} /> Composant</button>
                                                <button onClick={handleGenerateLabel} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-900 shadow-sm text-xs font-medium"><Printer size={14} /> Fiche Suiveuse</button>
                                                <button onClick={() => handleDeletePart(selectedPart.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16} /></button>
                                            </div>
                                        </div>

                                        {selectedPart.type === 'MANUFACTURED' ? (
                                            <div className="flex-1 flex flex-col p-4 bg-slate-50 overflow-hidden">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-bold text-slate-700 text-xs uppercase">Gamme de Fabrication</h4>
                                                    <button onClick={addOperation} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded-md hover:bg-slate-50 font-medium flex items-center gap-1"><Plus size={12} /> Ajouter Opération</button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto space-y-2 pr-2" onDragOver={handleOpDragOver} onDrop={(e) => handleOpDrop(e, 'end')}>
                                                    {selectedOps.map((op, index) => (
                                                        <div 
                                                            key={op.id} 
                                                            draggable
                                                            onDragStart={(e) => handleOpDragStart(e, op.id)}
                                                            onDragOver={handleOpDragOver}
                                                            onDrop={(e) => handleOpDrop(e, op.id)}
                                                            className={`bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 group transition-colors ${draggingOpId === op.id ? 'opacity-50 border-blue-400' : ''}`}
                                                        >
                                                            <div className="text-slate-400 cursor-grab hover:text-blue-500"><GripVertical size={16} /></div>
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">{index + 1}</div>
                                                            <div className="w-32">
                                                                <select className="w-full text-xs font-bold border-none focus:ring-0 cursor-pointer uppercase bg-transparent text-slate-900" value={op.machineType} onChange={e => updateOperation(op.id, 'machineType', e.target.value)}>
                                                                    {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex-1">
                                                                <input type="text" className={INLINE_INPUT_CLASS} placeholder="Instructions..." value={op.description} onChange={e => updateOperation(op.id, 'description', e.target.value)} />
                                                            </div>
                                                            {/* Open Full Edit Modal for this Op */}
                                                            <button onClick={() => setViewingOpDetails(op.id)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-blue-50" title="Ajouter docs / commentaires">
                                                                <MessageSquare size={16} />
                                                            </button>
                                                            <button onClick={() => deleteOperation(op.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                                        </div>
                                                    ))}
                                                    {selectedOps.length === 0 && <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">Définissez les étapes de fabrication ici.</div>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 flex-col gap-2">
                                                <Box size={48} className="opacity-20" />
                                                <p className="text-sm">Pièce du commerce / Achat</p>
                                                <p className="text-xs">Vous pouvez ajouter des sous-composants pour créer un kit ou un assemblage.</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm"><p>Sélectionnez un élément dans l'arborescence ou créez-en un.</p></div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MANUAL PART MODAL --- */}
            {isPartModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{editingPart ? 'Modifier Élément' : 'Nouvel Élément'}</h3>
                            <button onClick={() => setIsPartModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSavePart} className="p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom / Référence</label>
                                    <input name="name" required defaultValue={editingPart?.name || ''} className={INPUT_CLASS} placeholder="Ex: Plaque Support Moteur" />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantité</label>
                                    <input name="quantity" type="number" min="1" required defaultValue={editingPart?.quantity || 1} className={INPUT_CLASS} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                    <select 
                                        name="type" 
                                        defaultValue={editingPart?.type || 'MANUFACTURED'} 
                                        className={INPUT_CLASS}
                                    >
                                        <option value="MANUFACTURED">Fabriqué</option>
                                        <option value="PURCHASED">Achat / Commerce</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matière / Info</label>
                                    <input name="material" defaultValue={editingPart?.material || ''} className={INPUT_CLASS} placeholder="Ex: Acier S235 ep 5mm" />
                                </div>
                            </div>
                            
                            {/* Assembly Method Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Méthode d'Assemblage</label>
                                <select 
                                    name="assemblyMethodId" 
                                    defaultValue={editingPart?.assemblyMethodId || ''} 
                                    className={INPUT_CLASS}
                                >
                                    <option value="">-- Non spécifié --</option>
                                    {assemblyMethods.map(method => (
                                        <option key={method.id} value={method.id}>{method.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Rich Description / Instructions */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fiche de Débit / Instructions Atelier</label>
                                <textarea 
                                    name="description" 
                                    className={`${INPUT_CLASS} min-h-[100px]`}
                                    defaultValue={editingPart?.description || ''}
                                    placeholder="Entrez les instructions spécifiques, dimensions de coupe, etc..."
                                />
                            </div>

                            {/* Attachments Section within Modal */}
                            {editingPart && (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Plans & Fichiers</label>
                                        <label className="cursor-pointer text-blue-600 text-xs flex items-center gap-1 hover:underline">
                                            <Plus size={12} /> Ajouter
                                            <input type="file" className="hidden" onChange={handleAddAttachment} />
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        {editingPart.attachments?.map((att, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-white p-1 rounded border border-slate-100">
                                                <FileIcon size={14} className="text-slate-400"/>
                                                <span className="truncate flex-1">{att.name}</span>
                                            </div>
                                        ))}
                                        {(!editingPart.attachments || editingPart.attachments.length === 0) && <p className="text-xs text-slate-400 italic">Aucun fichier joint.</p>}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-2">
                                <button type="button" onClick={() => setIsPartModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-medium">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- OPERATION DETAILS MODAL (EDITABLE IN METHODS) --- */}
            {viewingOpDetails && operations.find(o => o.id === viewingOpDetails) && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ListChecks /> {operations.find(o => o.id === viewingOpDetails)?.machineType}</h3>
                                <p className="text-xs text-slate-500">{operations.find(o => o.id === viewingOpDetails)?.description}</p>
                            </div>
                            <button onClick={() => setViewingOpDetails(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Deadline Section */}
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Clock size={16}/> Date Butoire / Échéance</h4>
                                <input 
                                    type="date" 
                                    className={INPUT_CLASS}
                                    value={operations.find(o => o.id === viewingOpDetails)?.deadline ? new Date(operations.find(o => o.id === viewingOpDetails)!.deadline!).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleUpdateOpDetails(viewingOpDetails!, 'deadline', e.target.value ? new Date(e.target.value) : undefined)}
                                />
                            </div>

                            {/* Attachments Section */}
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><Paperclip size={16}/> Plans & Fichiers (Phase)</h4>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    {operations.find(o => o.id === viewingOpDetails)?.attachments?.map((att, idx) => (
                                        <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2">
                                            <div className="text-slate-500"><FileIcon size={16} /></div>
                                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">{att.name}</a>
                                        </div>
                                    ))}
                                    {(!operations.find(o => o.id === viewingOpDetails)?.attachments || operations.find(o => o.id === viewingOpDetails)?.attachments?.length === 0) && <p className="col-span-2 text-xs text-slate-400 italic">Aucun fichier pour cette phase.</p>}
                                </div>
                                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-50 cursor-pointer">
                                    <Plus size={14} /> Ajouter Fichier
                                    <input type="file" className="hidden" onChange={(e) => {
                                        if(e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            const newAtt: Attachment = {
                                                id: `att-op-${Date.now()}`,
                                                name: file.name,
                                                url: URL.createObjectURL(file),
                                                type: 'FILE',
                                                addedBy: 'Méthodes',
                                                date: new Date()
                                            };
                                            handleUpdateOpDetails(viewingOpDetails!, 'attachments', newAtt);
                                        }
                                    }} />
                                </label>
                            </div>

                            {/* Comments Section */}
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2 flex items-center gap-2"><MessageSquare size={16}/> Commentaires</h4>
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 min-h-[100px] max-h-[200px] overflow-y-auto mb-3 space-y-3">
                                    {operations.find(o => o.id === viewingOpDetails)?.comments?.map((comment) => (
                                        <div key={comment.id} className="bg-white p-2 rounded border border-slate-100 shadow-sm text-sm">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-bold text-slate-700 text-xs">{comment.userName}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-600">{comment.text}</p>
                                        </div>
                                    ))}
                                    {(!operations.find(o => o.id === viewingOpDetails)?.comments || operations.find(o => o.id === viewingOpDetails)?.comments?.length === 0) && <p className="text-xs text-slate-400 italic text-center py-4">Aucun commentaire.</p>}
                                </div>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const input = form.elements.namedItem('comment') as HTMLInputElement;
                                    if (input.value.trim()) {
                                        const newComment: TaskComment = {
                                            id: `cmt-${Date.now()}`,
                                            text: input.value,
                                            userId: 'u1', // Mock ID
                                            userName: 'Méthodes',
                                            createdAt: new Date()
                                        };
                                        handleUpdateOpDetails(viewingOpDetails!, 'comments', newComment);
                                        input.value = '';
                                    }
                                }} className="flex gap-2">
                                    <input name="comment" className={INPUT_CLASS} placeholder="Ajouter une note..." />
                                    <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Send size={16}/></button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

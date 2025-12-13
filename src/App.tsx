import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Save, 
  Trash2, 
  Trophy, 
  Frown, 
  Plus, 
  History, 
  BarChart3, 
  Calendar as CalendarIcon, 
  MapPin, 
  DollarSign, 
  Gamepad2,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Upload,
  Edit,
  LayoutList,
  CalendarDays,
  Store,
  Filter,
  HelpingHand,
  PlayCircle,
  RefreshCcw,
  Minus,
  Check,
  AlertCircle,
  FileText,
  Share,
  PlusSquare,
  Settings,
  Download,
  FileJson,
  RefreshCw,
  Box,
  Settings2,
  Flag,
  PlusCircle,
  Globe,
  Star,
  ExternalLink,
  Pencil,
  Image as ImageIcon,
  PieChart
} from 'lucide-react';

// --- Types ---
type PlayEvent = {
  type: 'assist' | 'reset';
  move: number;
  timestamp?: number;
};

type GameRecord = {
  id: string;
  date: string;
  storeName: string;
  prizeName: string;
  costPerPlay: number;
  moves: number;
  totalCost: number;
  result: 'win' | 'lose';
  photoUrl: string | null;
  startType?: 'initial' | 'continuation';
  hasAssist?: boolean;
  assistAt?: number | null;
  events?: PlayEvent[];
  memo?: string;
  seriesName?: string;
  settingName?: string;
  finishType?: string;
  createdAt: number;
};

type StoreOption = {
  id: string;
  name: string;
  createdAt: number;
  photoUrl?: string | null;
  location?: string;
  url?: string;
  boothCountRating?: number;
  boothSettings?: string;
  memo?: string;
  interiorPhotos?: string[];
};

type OptionItem = {
  id: string;
  name: string;
  createdAt: number;
};

// Form Data Type
type FormData = {
  date: string;
  storeName: string;
  prizeName: string;
  costPerPlay: number;
  moves: number;
  totalCost: number;
  result: 'win' | 'lose';
  photoUrl: string | null;
  startType: 'initial' | 'continuation';
  events: PlayEvent[];
  memo: string;
  hasAssist: boolean;
  assistAt: number | undefined;
  seriesName: string;
  settingName: string;
  finishType: string;
};

// Base Initial Form Data
const BASE_FORM_DATA: FormData = {
  date: '', 
  storeName: '',
  prizeName: '',
  costPerPlay: 100,
  moves: 1,
  totalCost: 100,
  result: 'win',
  photoUrl: null,
  startType: 'initial',
  events: [],
  memo: '',
  hasAssist: false,
  assistAt: undefined,
  seriesName: '',
  settingName: '',
  finishType: ''
};

// Helper to get initial data
const getInitialFormData = (): FormData => {
  const today = new Date().toISOString().split('T')[0];
  let loadedData = {};
  
  try {
    const savedConfig = localStorage.getItem('crelog_last_config');
    if (savedConfig) {
      loadedData = JSON.parse(savedConfig);
    }
  } catch (e) {
    console.error("Failed to load last config", e);
  }

  return {
    ...BASE_FORM_DATA,
    date: today,
    ...loadedData,
    prizeName: '',
    moves: 1,
    totalCost: (loadedData as any).costPerPlay || 100,
    result: 'win',
    photoUrl: null,
    startType: 'initial',
    events: [],
    memo: '',
    hasAssist: false,
    assistAt: undefined,
    finishType: ''
  };
};

// --- IndexedDB Helper ---
const DB_NAME = 'CraneGameLogDB';
const DB_VERSION = 2; 

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('store_options')) db.createObjectStore('store_options', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('series_options')) db.createObjectStore('series_options', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('setting_options')) db.createObjectStore('setting_options', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('finish_options')) db.createObjectStore('finish_options', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- Helper: Image Resizer ---
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- Components (Ordered strictly by dependency) ---

// 1. ConfirmationModal
const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="font-bold text-lg text-gray-800 mb-2 flex items-center gap-2">
          <AlertCircle className="text-red-500" /> 確認
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-gray-500 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition">キャンセル</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl shadow-md hover:bg-red-600 transition">破棄して移動</button>
        </div>
      </div>
    </div>
  );
};

// 2. AddOptionModal
const AddOptionModal = ({ isOpen, onClose, onAdd, title, placeholder }: { isOpen: boolean, onClose: () => void, onAdd: (name: string) => void, title: string, placeholder: string }) => {
  const [value, setValue] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
          <PlusCircle size={20} className="text-purple-500" /> {title}
        </h3>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6 focus:ring-2 focus:ring-pink-500 focus:outline-none text-base"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition">キャンセル</button>
          <button onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }} className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition transform active:scale-95">追加</button>
        </div>
      </div>
    </div>
  );
};

// 3. StoreDetailModal
const StoreDetailModal = ({ 
  store, 
  isOpen, 
  onClose, 
  onSave,
  allRecords 
}: { 
  store: StoreOption | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (updatedStore: StoreOption) => void,
  allRecords: GameRecord[]
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreOption | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const interiorFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store) {
      setEditingStore({ 
        ...store,
        interiorPhotos: store.interiorPhotos || [] 
      });
      setIsEditing(false); 
    }
  }, [store]);

  if (!isOpen || !editingStore) return null;

  // --- Statistics Logic for specific store ---
  const storeRecords = allRecords.filter(r => r.storeName === editingStore.name);
  const winRecords = storeRecords.filter(r => r.result === 'win');
  const loseRecords = storeRecords.filter(r => r.result === 'lose');

  const totalSpent = storeRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const winCount = winRecords.length;
  const winRate = storeRecords.length > 0 ? Math.round((winCount / storeRecords.length) * 100) : 0;
  
  // 獲得時
  const winTotalCost = winRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const winAvgCost = winCount > 0 ? Math.round(winTotalCost / winCount) : 0;

  // 撤退時
  const loseTotalCost = loseRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const loseCount = loseRecords.length;
  const loseAvgCost = loseCount > 0 ? Math.round(loseTotalCost / loseCount) : 0;
  
  // 実質平均単価（撤退込）
  const realAvgCostPerWin = winCount > 0 ? Math.round(totalSpent / winCount) : 0;

  // 決め手集計
  const finishCounts = winRecords.reduce((acc, r) => {
    const type = r.finishType || '未設定';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 円グラフ用データ作成
  const PIE_COLORS = ['#fbbf24', '#f87171', '#60a5fa', '#34d399', '#a78bfa', '#fb923c', '#9ca3af'];
  const finishData = Object.entries(finishCounts)
    .sort((a, b) => b[1] - a[1]) // 多い順にソート
    .map(([name, count], index) => ({
      name,
      count,
      color: PIE_COLORS[index % PIE_COLORS.length],
      percentage: (count / winCount) * 100
    }));

  // CSS conic-gradient の生成
  const getConicGradient = () => {
    if (winCount === 0) return 'gray';
    let currentDeg = 0;
    return `conic-gradient(${finishData.map(d => {
      const start = currentDeg;
      currentDeg += d.percentage;
      return `${d.color} ${start}% ${currentDeg}%`;
    }).join(', ')})`;
  };

  // --- Handlers ---
  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0]);
        setEditingStore(prev => prev ? ({ ...prev, photoUrl: resized }) : null);
      } catch (err) { alert("画像の処理に失敗しました。"); }
    }
  };

  const handleInteriorImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0]);
        setEditingStore(prev => {
          if (!prev) return null;
          const currentPhotos = prev.interiorPhotos || [];
          return { 
            ...prev, 
            interiorPhotos: [...currentPhotos, resized] 
          };
        });
      } catch (err) { alert("画像の処理に失敗しました。"); }
    }
  };

  const removeInteriorPhoto = (index: number) => {
    setEditingStore(prev => {
      if (!prev) return null;
      const currentPhotos = prev.interiorPhotos || [];
      const newPhotos = [...currentPhotos];
      newPhotos.splice(index, 1);
      return { ...prev, interiorPhotos: newPhotos };
    });
  };

  const handleRating = (rating: number) => {
    setEditingStore(prev => prev ? ({ ...prev, boothCountRating: rating }) : null);
  };

  const handleSave = () => {
    if (editingStore) {
      onSave(editingStore);
      setIsEditing(false);
    }
  };

  // --- Render Functions ---
  const renderViewMode = () => (
    <div className="flex-1 overflow-y-auto bg-gray-50 relative pb-24 no-scrollbar">
      {/* Hero Image */}
      <div className="h-64 w-full bg-gray-200 relative">
        {editingStore.photoUrl ? (
          <img src={editingStore.photoUrl} alt={editingStore.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <Store size={48} />
            <span className="text-sm font-bold">No Image</span>
          </div>
        )}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition backdrop-blur-sm z-10">
          <X size={20} />
        </button>
      </div>

      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-1">{editingStore.name}</h2>
            {editingStore.location && (
              <p className="text-sm text-gray-500 flex items-start gap-1">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                {editingStore.location}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
             <div className="flex flex-col">
               <span className="text-[10px] text-gray-400 font-bold uppercase">ブース数評価</span>
               <div className="flex items-center gap-1 text-yellow-500 font-bold text-lg">
                 <Star size={18} className="fill-yellow-500" />
                 {editingStore.boothCountRating ? editingStore.boothCountRating : '-'} <span className="text-xs text-gray-400 font-normal">/ 10</span>
               </div>
             </div>
             {editingStore.url && (
               <a href={editingStore.url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                 <Globe size={14} /> Webサイト
                 <ExternalLink size={12} />
               </a>
             )}
          </div>
        </div>

        {/* Store Specific Report */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 mt-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-500" />
            この店舗の戦績
          </h3>
          
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-gray-50 p-3 rounded-xl">
               <div className="text-[10px] text-gray-500 font-bold uppercase">総使用金額</div>
               <div className="text-lg font-black text-gray-800">¥{totalSpent.toLocaleString()}</div>
             </div>
             <div className="bg-gray-50 p-3 rounded-xl">
               <div className="text-[10px] text-gray-500 font-bold uppercase">獲得率</div>
               <div className="text-lg font-black text-gray-800">{winRate}%</div>
             </div>
             {/* 実績単価（リッチ表示） */}
             <div className="col-span-2 bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md text-white flex justify-between items-center">
               <div>
                 <div className="text-xs font-bold uppercase opacity-90 mb-1">実績単価 (撤退込)</div>
                 <div className="text-2xl font-black">¥{realAvgCostPerWin.toLocaleString()}</div>
               </div>
               <div className="text-right">
                 <span className="text-xs opacity-80 block">総獲得数</span>
                 <span className="text-xl font-bold">{winCount} <span className="text-xs font-normal">個</span></span>
               </div>
             </div>
          </div>

          {/* Win / Lose Detail */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
               <div className="text-xs font-bold text-yellow-700 flex items-center gap-1 mb-2"><Trophy size={12}/> 獲得実績</div>
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-yellow-800"><span>総額</span><span className="font-bold">¥{winTotalCost.toLocaleString()}</span></div>
                 <div className="flex justify-between text-xs text-yellow-800"><span>単価</span><span className="font-bold">¥{winAvgCost.toLocaleString()}</span></div>
               </div>
             </div>
             <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
               <div className="text-xs font-bold text-blue-700 flex items-center gap-1 mb-2"><Frown size={12}/> 撤退実績</div>
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-blue-800"><span>総額</span><span className="font-bold">¥{loseTotalCost.toLocaleString()}</span></div>
                 <div className="flex justify-between text-xs text-blue-800"><span>単価</span><span className="font-bold">¥{loseAvgCost.toLocaleString()}</span></div>
               </div>
             </div>
          </div>

          {/* Finish Pie Chart */}
          {winCount > 0 && (
             <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <PieChart size={12} /> 獲得時の決め手
                </h4>
                <div className="flex items-center gap-6">
                  {/* Pie Chart */}
                  <div 
                    className="w-24 h-24 rounded-full flex-shrink-0 shadow-inner"
                    style={{ background: getConicGradient() }}
                  />
                  {/* Legend */}
                  <div className="flex-1 space-y-1.5">
                    {finishData.map(d => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}></div>
                          <span className="text-gray-600 truncate max-w-[100px]">{d.name}</span>
                        </div>
                        <span className="font-bold text-gray-700">{d.count}回 <span className="text-gray-400 font-normal">({Math.round(d.percentage)}%)</span></span>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          )}
        </div>

        {/* Booth Settings & Memo */}
        {(editingStore.boothSettings || editingStore.memo) && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 mt-4">
             {editingStore.boothSettings && (
               <div>
                 <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-2"><Settings2 size={12} /> ブース設定</h4>
                 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{editingStore.boothSettings}</p>
               </div>
             )}
             {editingStore.memo && (
               <div>
                 <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1 mb-2"><FileText size={12} /> メモ</h4>
                 <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{editingStore.memo}</p>
               </div>
             )}
          </div>
        )}

        {/* Interior Photos Gallery */}
        {editingStore.interiorPhotos && editingStore.interiorPhotos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 mt-4">
             <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2"><ImageIcon size={16} className="text-blue-500" /> 店舗内写真</h4>
             <div className="grid grid-cols-2 gap-2">
                {editingStore.interiorPhotos.map((photo, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={photo} alt={`Interior ${index}`} className="w-full h-full object-cover" />
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Floating Edit Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-20">
        <button 
          onClick={() => setIsEditing(true)}
          className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
        >
          <Pencil size={18} />
          情報を編集
        </button>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <>
      <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center bg-gray-50 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Store size={20} className="text-purple-500" /> 店舗情報編集</h2>
        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-200 rounded-lg text-sm font-bold transition">キャンセル</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 no-scrollbar">
        {/* Main Photo Edit */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase">トップ画像</label>
          <div className="flex justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 bg-white border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition relative overflow-hidden group"
            >
              {editingStore.photoUrl ? (
                <>
                  <img src={editingStore.photoUrl} alt="Store" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold">写真を変更</span></div>
                </>
              ) : (
                <>
                  <Camera size={40} className="text-gray-300 mb-2" /><span className="text-sm text-gray-400 font-medium">写真をタップして追加</span>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleMainImageChange} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>

        {/* Interior Photos Edit */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
            <span>店舗内写真</span>
            <span className="text-[10px] font-normal">{editingStore.interiorPhotos?.length || 0} 枚</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {editingStore.interiorPhotos?.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200 relative group">
                <img src={photo} alt={`Interior ${index}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeInteriorPhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <div 
              onClick={() => interiorFileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50 transition cursor-pointer"
            >
              <Plus size={24} />
              <span className="text-[10px] font-bold">追加</span>
            </div>
            <input type="file" ref={interiorFileInputRef} onChange={handleInteriorImageChange} accept="image/*" className="hidden" />
          </div>
        </div>

        <div className="space-y-4">
           <div><label className="text-xs font-bold text-gray-500 uppercase">店名</label><input type="text" value={editingStore.name} onChange={e => setEditingStore({...editingStore, name: e.target.value})} className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"/></div>
           <div><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><MapPin size={12}/> 所在地</label><input type="text" value={editingStore.location || ''} onChange={e => setEditingStore({...editingStore, location: e.target.value})} placeholder="例: 東京都新宿区..." className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"/></div>
           <div><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Globe size={12}/> Webサイト URL</label><input type="url" value={editingStore.url || ''} onChange={e => setEditingStore({...editingStore, url: e.target.value})} placeholder="https://..." className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"/></div>
           <div>
             <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Star size={12}/> ブースの数 (10段階)</label>
             <div className="flex flex-wrap gap-1 mt-2">
               {[1,2,3,4,5,6,7,8,9,10].map(num => (
                 <button key={num} onClick={() => handleRating(num)} className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition ${(editingStore.boothCountRating || 0) >= num ? 'bg-yellow-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}><Star size={14} className={ (editingStore.boothCountRating || 0) >= num ? 'fill-white' : '' } /></button>
               ))}
             </div>
             <div className="text-right text-xs text-gray-400 mt-1">{editingStore.boothCountRating || 0} / 10</div>
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Settings2 size={12}/> ブースの設定</label>
             <textarea value={editingStore.boothSettings || ''} onChange={e => setEditingStore({...editingStore, boothSettings: e.target.value})} placeholder="例: 3本爪多め、橋渡し設定が厳しい..." className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[80px]"/>
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><FileText size={12}/> メモ</label>
             <textarea value={editingStore.memo || ''} onChange={e => setEditingStore({...editingStore, memo: e.target.value})} placeholder="その他のメモ..." className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none min-h-[100px]"/>
           </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-20">
        <button onClick={handleSave} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition">保存して完了</button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col animate-in slide-in-from-bottom duration-300">
      {isEditing ? renderEditMode() : renderViewMode()}
    </div>
  );
};

// 4. IOSInstallPrompt
const IOSInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-800">ホーム画面に追加してアプリ化</h3><button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button></div>
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">Safariの「シェア <Share size={12} className="inline"/>」ボタンから<br/>「ホーム画面に追加 <PlusSquare size={12} className="inline"/>」を選択すると<br/>全画面で快適に利用できます。</p>
      <div className="flex justify-center"><div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95 absolute -bottom-2"></div></div>
    </div>
  );
};

// 5. NavButton
const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 pb-1 ${active ? 'text-purple-600' : 'text-gray-400'}`}>
    {icon}<span className="text-[10px] font-medium">{label}</span>
  </button>
);

// 6. PlayModeOverlay
const PlayModeOverlay = ({ moves, events, onIncrement, onDecrement, onEvent, onClose, viewportHeight }: { moves: number, events: PlayEvent[], onIncrement: () => void, onDecrement: () => void, onEvent: (type: 'assist' | 'reset') => void, onClose: () => void, viewportHeight: string }) => {
  const [confirmType, setConfirmType] = useState<'assist' | 'reset' | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(viewportHeight);

  useEffect(() => { setOverlayHeight(viewportHeight); }, [viewportHeight]);

  return (
    <div className="fixed top-0 left-0 w-full bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]" style={{ height: overlayHeight }}>
      <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex justify-between items-center bg-gray-50 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Gamepad2 className="text-pink-500" /> プレイモード</h2>
        <button onClick={onClose} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold shadow-lg active:scale-95 transition">終了</button>
      </div>
      <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto no-scrollbar">
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-4 border-gray-100 relative min-h-[200px]">
          <div className="text-gray-400 font-bold text-xl uppercase mb-2">Move</div>
          <div className="text-9xl font-black text-gray-800 tabular-nums tracking-tighter">{moves}</div>
          <div className="absolute bottom-6 right-6 flex gap-4"><button onClick={onDecrement} className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-400 shadow-sm active:scale-90 transition"><Minus size={32} /></button></div>
          {events.length > 0 && (
            <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 pointer-events-none">
              {events.map((ev, i) => (
                <span key={i} className={`text-[10px] px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1 ${ev.type === 'assist' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>{ev.type === 'assist' ? <HelpingHand size={10} /> : <RefreshCcw size={10} />}{ev.move}手</span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 h-48 flex-shrink-0">
          <button onClick={onIncrement} className="col-span-2 bg-pink-500 text-white rounded-2xl shadow-xl active:bg-pink-600 active:scale-[0.98] transition flex items-center justify-center gap-4 group"><Plus size={48} className="group-active:scale-125 transition duration-150" /><span className="text-3xl font-black">カウント</span></button>
          <button onClick={() => setConfirmType('reset')} className="bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-xl active:bg-blue-100 transition flex flex-col items-center justify-center gap-1"><RefreshCcw size={28} /><span className="font-bold text-sm">初期位置</span></button>
          <button onClick={() => setConfirmType('assist')} className="bg-green-50 border-2 border-green-100 text-green-600 rounded-xl active:bg-green-100 transition flex flex-col items-center justify-center gap-1"><HelpingHand size={28} /><span className="font-bold text-sm">アシスト</span></button>
        </div>
      </div>
      {confirmType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmType === 'assist' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{confirmType === 'assist' ? <HelpingHand size={24} /> : <RefreshCcw size={24} />}</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{confirmType === 'assist' ? 'アシストを記録しますか？' : '初期位置に戻しますか？'}</h3>
            <p className="text-sm text-gray-500 mb-6">現在の「{moves}手目」に<br/>{confirmType === 'assist' ? '店員さんのアシスト' : '位置のリセット'}があったことを記録します。</p>
            <div className="flex gap-3"><button onClick={() => setConfirmType(null)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition">キャンセル</button><button onClick={() => { onEvent(confirmType); setConfirmType(null); }} className={`flex-1 py-3 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95 ${confirmType === 'assist' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>記録する</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

// 7. StatsView
const StatsView = ({ records, storeOptions, onUpdateStore }: { records: GameRecord[], storeOptions: StoreOption[], onUpdateStore: (store: StoreOption) => void }) => {
  const [tab, setTab] = useState<'report' | 'stores'>('report');
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [targetDate, setTargetDate] = useState(new Date());
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);

  const movePeriod = (direction: -1 | 1) => {
    const newDate = new Date(targetDate);
    if (periodType === 'day') newDate.setDate(newDate.getDate() + direction);
    if (periodType === 'month') newDate.setMonth(newDate.getMonth() + direction);
    if (periodType === 'year') newDate.setFullYear(newDate.getFullYear() + direction);
    setTargetDate(newDate);
  };

  const formatDateLabel = () => {
    if (periodType === 'all') return '全期間';
    if (periodType === 'year') return `${targetDate.getFullYear()}年`;
    if (periodType === 'month') return `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月`;
    if (periodType === 'day') return `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月${targetDate.getDate()}日`;
    return '';
  };

  const filteredRecords = records.filter(r => {
    if (periodType === 'all') return true;
    const rDate = new Date(r.date);
    if (rDate.getFullYear() !== targetDate.getFullYear()) return false;
    if (periodType === 'year') return true;
    if (rDate.getMonth() !== targetDate.getMonth()) return false;
    if (periodType === 'month') return true;
    if (rDate.getDate() !== targetDate.getDate()) return false;
    return true;
  });

  const totalSpent = filteredRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const winRecords = filteredRecords.filter(r => r.result === 'win');
  const loseRecords = filteredRecords.filter(r => r.result === 'lose');
  const winTotalSpent = winRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const winCount = winRecords.length;
  const winAvg = winCount > 0 ? Math.round(winTotalSpent / winCount) : 0;
  const loseTotalSpent = loseRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const loseCount = loseRecords.length;
  const loseAvg = loseCount > 0 ? Math.round(loseTotalSpent / loseCount) : 0;
  const winRate = filteredRecords.length > 0 ? Math.round((winCount / filteredRecords.length) * 100) : 0;
  const avgCostPerWin = winRecords.length > 0 ? Math.round(winRecords.reduce((sum, r) => sum + r.totalCost, 0) / winRecords.length) : 0;
  const realAvgCostPerWin = winCount > 0 ? Math.round(totalSpent / winCount) : 0;
  const recentWins = filteredRecords.filter(r => r.result === 'win' && r.photoUrl).slice(0, 6);

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-gray-800">{tab === 'report' ? '戦績レポート' : '店舗管理'}</h2><div className="flex bg-gray-200 p-1 rounded-lg"><button onClick={() => setTab('report')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${tab === 'report' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>レポート</button><button onClick={() => setTab('stores')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${tab === 'stores' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>店舗</button></div></div>
      {tab === 'report' ? (
        <>
          <div className="flex bg-gray-200 p-1 rounded-xl mb-4">{(['day', 'month', 'year', 'all'] as const).map((type) => (<button key={type} onClick={() => setPeriodType(type)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${periodType === type ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}>{type === 'day' && '日'}{type === 'month' && '月'}{type === 'year' && '年'}{type === 'all' && '全期間'}</button>))}</div>
          {periodType !== 'all' && (
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-4"><button onClick={() => movePeriod(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={20} /></button><span className="font-bold text-gray-700">{formatDateLabel()}</span><button onClick={() => movePeriod(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={20} /></button></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><div className="text-xs text-gray-500 font-bold uppercase mb-1">総使用金額</div><div className="text-2xl font-black text-gray-800">¥{totalSpent.toLocaleString()}</div></div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><div className="text-xs text-gray-500 font-bold uppercase mb-1">獲得率</div><div className="text-2xl font-black text-gray-800">{winRate}<span className="text-sm font-normal text-gray-400">%</span></div></div>
            <div className="col-span-2 bg-gradient-to-r from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-md text-white"><div className="flex justify-between items-center"><div><div className="text-xs font-bold uppercase opacity-90 mb-1">実質平均単価 (撤退込)</div><div className="text-3xl font-black">¥{realAvgCostPerWin.toLocaleString()}</div></div><div className="bg-white/20 p-3 rounded-full"><Trophy size={24} className="text-white" /></div></div><div className="mt-2 text-[10px] opacity-80 text-right">総額 ¥{totalSpent.toLocaleString()} ÷ {winCount}個</div></div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl"><h3 className="text-yellow-800 font-bold flex items-center gap-2 mb-3"><Trophy size={18} className="fill-yellow-600 text-yellow-600" /> 獲得 (Win)</h3><div className="grid grid-cols-2 gap-4"><div><div className="text-xs text-yellow-600 font-bold mb-1">獲得総額</div><div className="text-xl font-black text-yellow-900">¥{winTotalSpent.toLocaleString()}</div></div><div><div className="text-xs text-yellow-600 font-bold mb-1">平均/個</div><div className="text-xl font-black text-yellow-900">¥{winAvg.toLocaleString()}</div></div></div><div className="text-right text-xs text-yellow-700 mt-2 font-medium border-t border-yellow-200 pt-2">{winCount} 個獲得</div></div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl"><h3 className="text-blue-800 font-bold flex items-center gap-2 mb-3"><Frown size={18} className="text-blue-600" /> 撤退 (Lose)</h3><div className="grid grid-cols-2 gap-4"><div><div className="text-xs text-blue-600 font-bold mb-1">撤退総額</div><div className="text-xl font-black text-blue-900">¥{loseTotalSpent.toLocaleString()}</div></div><div><div className="text-xs text-blue-600 font-bold mb-1">平均/回</div><div className="text-xl font-black text-blue-900">¥{loseAvg.toLocaleString()}</div></div></div><div className="text-right text-xs text-blue-700 mt-2 font-medium border-t border-blue-200 pt-2">{loseCount} 回撤退</div></div>
          {recentWins.length > 0 && (<div className="mt-6"><div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-700">最近の獲得ギャラリー</h3><span className="text-xs text-gray-400">最新{recentWins.length}件</span></div><div className="grid grid-cols-3 gap-2">{recentWins.map((r) => (<div key={r.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative shadow-sm"><img src={r.photoUrl!} alt={r.prizeName} className="w-full h-full object-cover" /><div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-1"><p className="text-[10px] text-white truncate">{r.prizeName}</p></div></div>))}</div></div>)}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg mt-6"><h3 className="font-bold text-lg mb-1">次の景品も狙い撃ち！</h3><p className="text-sm opacity-90 mb-3">{winRate > 50 ? '素晴らしい成績です！この調子でいきましょう。' : '焦らず狙いを定めて、確実な勝利を目指しましょう。'}</p></div>
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">店舗をタップして詳細情報を編集できます。</p>
          {storeOptions.length === 0 ? (<div className="text-center py-10 text-gray-400 text-sm">店舗がまだ登録されていません。<br/>「記録」画面から追加してください。</div>) : (storeOptions.map(store => (<div key={store.id} onClick={() => setSelectedStore(store)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex cursor-pointer hover:bg-gray-50 transition"><div className="w-24 bg-gray-100 flex items-center justify-center">{store.photoUrl ? (<img src={store.photoUrl} alt={store.name} className="w-full h-full object-cover" />) : (<Store size={24} className="text-gray-300" />)}</div><div className="flex-1 p-3"><h3 className="font-bold text-gray-800">{store.name}</h3><div className="flex items-center gap-1 mt-1 text-xs text-gray-500"><MapPin size={12} /><span className="truncate">{store.location || '所在地未設定'}</span></div><div className="flex items-center gap-3 mt-2"><div className="flex items-center gap-0.5 text-xs text-yellow-500 font-bold bg-yellow-50 px-1.5 py-0.5 rounded"><Star size={10} className="fill-yellow-500" />{store.boothCountRating ? store.boothCountRating : '-'}</div>{store.url && (<div className="flex items-center gap-0.5 text-xs text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded"><Globe size={10} /> Web</div>)}</div></div><div className="flex items-center justify-center w-8 text-gray-300"><ChevronRight size={18} /></div></div>)))}
          
          <StoreDetailModal 
            store={selectedStore} 
            isOpen={!!selectedStore} 
            onClose={() => setSelectedStore(null)} 
            onSave={(updatedStore) => { onUpdateStore(updatedStore); setSelectedStore(null); }} 
            allRecords={records}
          />
        </div>
      )}
    </div>
  );
};

// 8. ListView (No changes)
const ListView = ({ records, onDelete, onEdit, onAdd }: { records: GameRecord[], onDelete: (id: string) => void, onEdit: (r: GameRecord) => void, onAdd: () => void }) => {
  const [filterStore, setFilterStore] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const uniqueStores = Array.from(new Set(records.map(r => r.storeName).filter(Boolean))).sort();
  const filteredRecords = records.filter(r => filterStore === 'all' ? true : r.storeName === filterStore);
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const dateKey = record.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(record);
    return acc;
  }, {} as Record<string, GameRecord[]>);
  const sortedGroupedEntries = Object.entries(groupedRecords).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  const toggleDate = (date: string) => { const newExpanded = new Set(expandedDates); if (newExpanded.has(date)) newExpanded.delete(date); else newExpanded.add(date); setExpandedDates(newExpanded); };

  if (records.length === 0) return (<div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 p-8 text-center"><Gamepad2 size={64} className="opacity-20" /><p>記録がまだありません。<br />「+」ボタンから最初のプレイを記録しましょう！</p><button onClick={onAdd} className="bg-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow hover:bg-pink-600 transition">記録する</button></div>);

  return (
    <div className="p-4 space-y-6">
      {uniqueStores.length > 0 && <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"><Filter size={16} className="text-gray-400 flex-shrink-0" /><button onClick={() => setFilterStore('all')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${filterStore === 'all' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>すべて</button>{uniqueStores.map(store => (<button key={store} onClick={() => setFilterStore(store)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${filterStore === store ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{store}</button>))}</div>}
      {sortedGroupedEntries.length === 0 ? (<div className="text-center text-gray-400 py-8 text-sm">該当する記録がありません</div>) : (sortedGroupedEntries.map(([date, groupRecords]) => {
          const isExpanded = expandedDates.has(date);
          const totalCost = groupRecords.reduce((sum, r) => sum + r.totalCost, 0);
          return (
            <div key={date} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-300">
              <div onClick={() => toggleDate(date)} className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition select-none">
                <div className="text-gray-400">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                <div className="flex-1 flex flex-col"><span className="text-sm font-bold text-gray-700">{new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span><span className="text-[10px] text-gray-400 font-medium">{groupRecords.length} プレイ</span></div>
                <span className="text-sm font-black text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100">¥{totalCost.toLocaleString()}</span>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                  {groupRecords.map((record, idx) => (
                    <div key={record.id} className={`flex flex-col p-3 ${idx !== groupRecords.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100">{record.photoUrl ? <img src={record.photoUrl} alt={record.prizeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={16} /></div>}<div className={`absolute bottom-0 w-full h-1 ${record.result === 'win' ? 'bg-yellow-400' : 'bg-blue-300'}`}></div></div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{record.prizeName || '名称未設定'}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={8} /> {record.storeName || '店名なし'}</p>
                              {record.seriesName && <p className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1 rounded"><Box size={8} /> {record.seriesName}</p>}
                              {record.settingName && <p className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1 rounded"><Settings2 size={8} /> {record.settingName}</p>}
                              {record.finishType && <p className="text-[10px] text-yellow-600 flex items-center gap-1 bg-yellow-50 px-1 rounded"><Flag size={8} /> {record.finishType}</p>}
                              {record.events && record.events.length > 0 ? (
                                record.events.map((e, i) => (
                                  <p key={i} className={`text-[9px] flex items-center gap-0.5 px-1 rounded border ${e.type === 'assist' ? 'text-green-700 bg-green-50 border-green-100' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>{e.type === 'assist' ? <HelpingHand size={8} /> : <RefreshCcw size={8} />}{e.move}手目</p>
                                ))
                              ) : (
                                <>{record.startType && <p className="text-[9px] text-gray-500 flex items-center gap-0.5 bg-gray-100 px-1 rounded"><PlayCircle size={8} /> {record.startType === 'initial' ? '初期' : '途中'}</p>}{record.hasAssist && <p className="text-[9px] text-green-700 flex items-center gap-0.5 bg-green-50 px-1 rounded border border-green-100"><HelpingHand size={8} /> {record.assistAt ? `${record.assistAt}手` : 'あり'}</p>}</>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-end mt-1">
                            <div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${record.result === 'win' ? 'bg-yellow-100 text-yellow-700 border border-yellow-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{record.result === 'win' ? 'GET' : '撤退'}</span><span className="text-xs font-bold text-gray-700">¥{record.totalCost.toLocaleString()}</span></div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => onEdit(record)} className="p-1.5 text-gray-400 hover:text-pink-500 p-1.5 transition"><Edit size={14} /></button>
                              <button onClick={() => onDelete(record.id)} className="p-1.5 text-gray-400 hover:text-red-500 p-1.5 transition"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {record.memo && <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 flex gap-2 items-start"><FileText size={12} className="text-gray-400 mt-0.5 flex-shrink-0" /><span className="whitespace-pre-wrap leading-relaxed">{record.memo}</span></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      <div className="h-12 text-center text-xs text-gray-400 pt-4">これ以上の履歴はありません</div>
    </div>
  );
};

// 9. CalendarView (No changes)
const CalendarView = ({ records, onEdit, onDelete }: { records: GameRecord[], onEdit: (r: GameRecord) => void, onDelete: (id: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{date: string, records: GameRecord[]} | null>(null);
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const dailyTotals = records.reduce((acc, record) => {
    const d = new Date(record.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!acc[day]) acc[day] = { cost: 0, count: 0, records: [] };
      acc[day].cost += record.totalCost;
      acc[day].count += 1;
      acc[day].records.push(record);
    }
    return acc;
  }, {} as Record<number, { cost: number, count: number, records: GameRecord[] }>);
  const handleDayClick = (day: number, dailyRecords: GameRecord[]) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay({ date: dateStr, records: dailyRecords });
  };
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4"><button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronLeft size={24} /></button><h2 className="text-xl font-bold text-gray-800">{year}年 {month + 1}月</h2><button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronRight size={24} /></button></div>
      <div className="mb-4 bg-pink-50 rounded-lg p-3 flex justify-between items-center text-sm"><span className="text-gray-600 font-bold">今月の合計</span><span className="text-xl font-black text-pink-600">¥{Object.values(dailyTotals).reduce((sum, d) => sum + d.cost, 0).toLocaleString()}</span></div>
      <div className="grid grid-cols-7 gap-1 mb-2">{['日', '月', '火', '水', '木', '金', '土'].map((day, i) => <div key={i} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{day}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">{blanks.map((_, i) => <div key={`blank-${i}`} className="aspect-square bg-gray-50 rounded-md" />)}{days.map((day) => { const data = dailyTotals[day]; const hasData = !!data; let bgClass = "bg-white border-gray-100"; if (hasData) { if (data.cost > 5000) bgClass = "bg-pink-200 border-pink-300"; else if (data.cost > 2000) bgClass = "bg-pink-100 border-pink-200"; else bgClass = "bg-pink-50 border-pink-100"; } const isToday = new Date().toDateString() === new Date(year, month, day).toDateString(); return (<div key={day} onClick={() => handleDayClick(day, data?.records || [])} className={`aspect-square rounded-lg border p-1 flex flex-col justify-between relative overflow-hidden cursor-pointer active:scale-95 transition ${bgClass} ${isToday ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}><span className={`text-xs font-bold ${isToday ? 'text-purple-600' : 'text-gray-500'}`}>{day}</span>{hasData && <div className="text-[9px] font-bold text-gray-700 text-right leading-tight">¥{data.cost.toLocaleString()}</div>}</div>); })}</div>
      <div className="mt-6"><h3 className="text-sm font-bold text-gray-500 mb-2">今月の詳細</h3>{Object.keys(dailyTotals).length === 0 ? <div className="text-center text-xs text-gray-400 py-4">この月の記録はありません</div> : <div className="text-xs text-gray-400 text-center py-2">日付をタップすると詳細が表示されます</div>}</div>
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={() => setSelectedDay(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-10 duration-200 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3"><div className="flex flex-col"><h3 className="font-bold text-lg text-gray-800">{new Date(selectedDay.date).toLocaleDateString('ja-JP', {year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'})}</h3><span className="text-xs text-gray-500">合計: ¥{selectedDay.records.reduce((sum, r) => sum + r.totalCost, 0).toLocaleString()}</span></div><button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button></div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {selectedDay.records.length > 0 ? (
                selectedDay.records.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100">{record.photoUrl ? <img src={record.photoUrl} alt={record.prizeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={16} /></div>}<div className={`absolute bottom-0 w-full h-1 ${record.result === 'win' ? 'bg-yellow-400' : 'bg-blue-300'}`}></div></div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div><h4 className="text-sm font-bold text-gray-800 line-clamp-1">{record.prizeName}</h4><div className="flex items-center gap-2 mt-1 flex-wrap"><p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={8} /> {record.storeName}</p>{record.seriesName && <p className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1 rounded"><Box size={8} /> {record.seriesName}</p>}{record.settingName && <p className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-1 rounded"><Settings2 size={8} /> {record.settingName}</p>}{record.finishType && <p className="text-[10px] text-yellow-600 flex items-center gap-1 bg-yellow-50 px-1 rounded"><Flag size={8} /> {record.finishType}</p>}</div></div>
                        <div className="flex justify-between items-end mt-1">
                          <div className="flex items-center gap-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${record.result === 'win' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{record.result === 'win' ? 'GET' : '撤退'}</span><span className="text-xs font-bold text-gray-700">¥{record.totalCost.toLocaleString()}</span></div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { onEdit(record); setSelectedDay(null); }} className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-white rounded-lg transition"><Edit size={14} /></button>
                            <button onClick={() => onDelete(record.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {record.memo && <div className="mt-2 pt-2 border-t border-gray-200/50 flex gap-2"><FileText size={10} className="text-gray-400 mt-0.5 flex-shrink-0" /><p className="text-[10px] text-gray-600 line-clamp-2">{record.memo}</p></div>}
                  </div>
                ))
              ) : (<div className="text-center text-gray-400 py-8">記録はありません</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 10. HistoryContainer (Used by CraneGameLog)
const HistoryContainer = ({ records, onDelete, onEdit, onAdd }: { records: GameRecord[], onDelete: (id: string) => void, onEdit: (r: GameRecord) => void, onAdd: () => void }) => {
  const [mode, setMode] = useState<'list' | 'calendar'>('list');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button onClick={() => setMode('list')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${mode === 'list' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}><LayoutList size={16} />リスト</button>
          <button onClick={() => setMode('calendar')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${mode === 'calendar' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}><CalendarDays size={16} />カレンダー</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {mode === 'list' ? <ListView records={records} onDelete={onDelete} onEdit={onEdit} onAdd={onAdd} /> : <CalendarView records={records} onEdit={onEdit} onDelete={onDelete} />}
      </div>
    </div>
  );
};

// 11. AddForm (Updated with new fields)
const AddForm = ({ 
  initialData, 
  storeOptions, 
  seriesOptions, 
  settingOptions, 
  finishOptions, 
  onSave, 
  onAddStore, 
  onAddSeries, 
  onAddSetting, 
  onAddFinish, 
  onCancel, 
  formData, 
  setFormData, 
  viewportHeight 
}: { 
  initialData: GameRecord | null, 
  storeOptions: OptionItem[], 
  seriesOptions: OptionItem[],
  settingOptions: OptionItem[],
  finishOptions: OptionItem[],
  onSave: (r: any) => void, 
  onAddStore: (name: string) => void, 
  onAddSeries: (name: string) => void,
  onAddSetting: (name: string) => void,
  onAddFinish: (name: string) => void,
  onCancel: () => void, 
  formData: FormData, 
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  viewportHeight: string 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeModal, setActiveModal] = useState<'store' | 'series' | 'setting' | 'finish' | null>(null);
  const [isPlayMode, setIsPlayMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalCost = formData.costPerPlay * formData.moves;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0]);
        setFormData(prev => ({ ...prev, photoUrl: resized }));
      } catch (err) {
        console.error("Image processing failed", err);
        alert("画像の処理に失敗しました。");
      }
    }
  };

  const handlePlayIncrement = () => { setFormData(prev => ({ ...prev, moves: prev.moves + 1 })); };
  const handlePlayDecrement = () => { setFormData(prev => ({ ...prev, moves: Math.max(1, prev.moves - 1) })); };
  const handlePlayEvent = (type: 'assist' | 'reset') => {
    const currentMove = formData.moves;
    const newEvent: PlayEvent = { type, move: currentMove, timestamp: Date.now() };
    setFormData(prev => {
      const next = { ...prev, events: [...prev.events, newEvent] };
      if (type === 'assist') { next.hasAssist = true; next.assistAt = currentMove; }
      return next;
    });
  };
  
  const handleCancelButton = () => {
    onCancel(); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prizeName) { alert("景品名を入力してください"); return; }
    if (!formData.storeName) { alert("店名を選択してください"); return; }
    setIsSubmitting(true);
    const dataToSave = { ...formData, totalCost, assistAt: formData.assistAt === undefined ? null : formData.assistAt };
    await onSave(dataToSave);
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-full">
      {isPlayMode && <PlayModeOverlay moves={formData.moves} events={formData.events} onIncrement={handlePlayIncrement} onDecrement={handlePlayDecrement} onEvent={handlePlayEvent} onClose={() => setIsPlayMode(false)} viewportHeight={viewportHeight} />}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{initialData ? '記録を編集' : '新規記録'}</h2>
        <button onClick={handleCancelButton} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"><X size={20} className="text-gray-600" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <button type="button" onClick={() => setIsPlayMode(true)} className="w-full bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between group active:scale-[0.98] transition">
          <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><Gamepad2 size={24} className="text-white" /></div><div className="text-left"><div className="text-xs text-gray-300 font-bold uppercase">集中モード</div><div className="text-lg font-bold">プレイを開始</div></div></div>
          <ChevronRight className="text-gray-400 group-hover:text-white transition" />
        </button>
        <div className="flex justify-center">
          <div onClick={() => fileInputRef.current?.click()} className="w-full h-48 bg-white border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition relative overflow-hidden group">
            {formData.photoUrl ? (<><img src={formData.photoUrl} alt="Preview" className="w-full h-full object-contain" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><span className="text-white font-bold">写真を変更</span></div></>) : (<><Camera size={40} className="text-gray-300 mb-2" /><span className="text-sm text-gray-400 font-medium">写真をタップして追加</span></>)}
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setFormData(prev => ({...prev, result: 'win'}))} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.result === 'win' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400'}`}><Trophy size={28} className={formData.result === 'win' ? 'text-yellow-500' : ''} /><span className="font-bold">GET!</span></button>
          <button type="button" onClick={() => setFormData(prev => ({...prev, result: 'lose'}))} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${formData.result === 'lose' ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 bg-white text-gray-400'}`}><Frown size={28} className={formData.result === 'lose' ? 'text-blue-500' : ''} /><span className="font-bold">撤退...</span></button>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">日付</label><div className="relative"><input type="date" required value={formData.date} onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-pink-500 focus:outline-none" /><CalendarIcon size={18} className="absolute left-3 top-3.5 text-gray-400" /></div></div>
          <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">景品名</label><input type="text" required placeholder="例: ちいかわ ぬいぐるみ" value={formData.prizeName} onChange={(e) => setFormData(prev => ({...prev, prizeName: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none" /></div>
          {/* 店名 */}
          <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">店名</label><div className="flex gap-2"><div className="relative flex-1"><select value={formData.storeName} onChange={(e) => setFormData(prev => ({...prev, storeName: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"><option value="" disabled>店名を選択</option>{storeOptions.map(item => (<option key={item.id} value={item.name}>{item.name}</option>))}{formData.storeName && !storeOptions.some(s => s.name === formData.storeName) && (<option value={formData.storeName}>{formData.storeName}</option>)}</select><Store size={18} className="absolute left-3 top-3.5 text-gray-400" /><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronRight className="w-4 h-4 text-gray-400 rotate-90" /></div></div><button type="button" onClick={() => setActiveModal('store')} className="bg-purple-100 text-purple-600 p-3 rounded-lg hover:bg-purple-200 transition flex items-center justify-center shadow-sm" title="新しい店名を追加"><Plus size={20} /></button></div></div>
          {/* シリーズ */}
          <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">シリーズ</label><div className="flex gap-2"><div className="relative flex-1"><select value={formData.seriesName} onChange={(e) => setFormData(prev => ({...prev, seriesName: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"><option value="" disabled>シリーズを選択</option>{seriesOptions.map(item => (<option key={item.id} value={item.name}>{item.name}</option>))}{formData.seriesName && !seriesOptions.some(s => s.name === formData.seriesName) && (<option value={formData.seriesName}>{formData.seriesName}</option>)}</select><Box size={18} className="absolute left-3 top-3.5 text-gray-400" /><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronRight className="w-4 h-4 text-gray-400 rotate-90" /></div></div><button type="button" onClick={() => setActiveModal('series')} className="bg-purple-100 text-purple-600 p-3 rounded-lg hover:bg-purple-200 transition flex items-center justify-center shadow-sm" title="新しいシリーズを追加"><Plus size={20} /></button></div></div>
          {/* 設定 */}
          <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">ブース設定</label><div className="flex gap-2"><div className="relative flex-1"><select value={formData.settingName} onChange={(e) => setFormData(prev => ({...prev, settingName: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"><option value="" disabled>設定を選択</option>{settingOptions.map(item => (<option key={item.id} value={item.name}>{item.name}</option>))}{formData.settingName && !settingOptions.some(s => s.name === formData.settingName) && (<option value={formData.settingName}>{formData.settingName}</option>)}</select><Settings2 size={18} className="absolute left-3 top-3.5 text-gray-400" /><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronRight className="w-4 h-4 text-gray-400 rotate-90" /></div></div><button type="button" onClick={() => setActiveModal('setting')} className="bg-purple-100 text-purple-600 p-3 rounded-lg hover:bg-purple-200 transition flex items-center justify-center shadow-sm" title="新しい設定を追加"><Plus size={20} /></button></div></div>
          {/* FINISH (Win時のみ) */}
          {formData.result === 'win' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2"><label className="text-xs font-bold text-yellow-600 uppercase">FINISH (決め手)</label><div className="flex gap-2"><div className="relative flex-1"><select value={formData.finishType} onChange={(e) => setFormData(prev => ({...prev, finishType: e.target.value}))} className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-3 pl-10 appearance-none focus:ring-2 focus:ring-yellow-500 focus:outline-none text-yellow-800"><option value="" disabled>決め手を選択</option>{finishOptions.map(item => (<option key={item.id} value={item.name}>{item.name}</option>))}{formData.finishType && !finishOptions.some(s => s.name === formData.finishType) && (<option value={formData.finishType}>{formData.finishType}</option>)}</select><Flag size={18} className="absolute left-3 top-3.5 text-yellow-500" /><div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"><ChevronRight className="w-4 h-4 text-yellow-500 rotate-90" /></div></div><button type="button" onClick={() => setActiveModal('finish')} className="bg-yellow-100 text-yellow-600 p-3 rounded-lg hover:bg-yellow-200 transition flex items-center justify-center shadow-sm" title="新しい決め手を追加"><Plus size={20} /></button></div></div>
          )}
        </div>
        
        {/* Play Details & Cost (Original) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase">プレイ状況</label>
             <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setFormData(prev => ({...prev, startType: 'initial'}))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${formData.startType === 'initial' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-400'}`}>初期位置から</button>
                <button type="button" onClick={() => setFormData(prev => ({...prev, startType: 'continuation'}))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${formData.startType === 'continuation' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-400'}`}>途中から</button>
             </div>
             {formData.events.length > 0 && (<div className="space-y-1 mb-2"><div className="text-[10px] text-gray-400 font-bold uppercase">イベント履歴</div>{formData.events.map((ev, i) => (<div key={i} className="flex justify-between text-xs bg-gray-50 p-2 rounded border border-gray-100"><span className="flex items-center gap-1 font-bold text-gray-700">{ev.type === 'assist' ? <HelpingHand size={12} className="text-green-500"/> : <RefreshCcw size={12} className="text-blue-500"/>}{ev.type === 'assist' ? 'アシスト' : '初期位置'}</span><span>{ev.move}手目</span></div>))}</div>)}
          </div>
          <div className="border-t border-gray-100 my-2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">1PLAY料金</label><div className="relative"><select value={formData.costPerPlay} onChange={(e) => setFormData(prev => ({...prev, costPerPlay: Number(e.target.value)}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"><option value="100">100円</option><option value="200">200円</option><option value="100">10円</option><option value="300">300円</option></select><DollarSign size={14} className="absolute right-3 top-4 text-gray-400 pointer-events-none" /></div></div>
            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">手数</label><div className="flex items-center"><button type="button" onClick={() => setFormData(prev => ({...prev, moves: Math.max(1, prev.moves - 1)}))} className="w-10 h-10 bg-gray-100 rounded-l-lg flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">-</button><input type="number" min="1" value={formData.moves} onChange={(e) => setFormData(prev => ({...prev, moves: Math.max(1, Number(e.target.value))}))} className="w-full h-10 text-center bg-white border-y border-gray-200 focus:outline-none" /><button type="button" onClick={() => setFormData(prev => ({...prev, moves: prev.moves + 1}))} className="w-10 h-10 bg-gray-100 rounded-r-lg flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200">+</button></div></div>
          </div>
          <div className="pt-2 border-t border-gray-100 flex justify-between items-center"><span className="text-sm font-bold text-gray-500">合計金額</span><span className="text-2xl font-black text-pink-600">¥{totalCost.toLocaleString()}</span></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-2"><label className="text-xs font-bold text-gray-500 uppercase">メモ</label><textarea value={formData.memo} onChange={(e) => setFormData(prev => ({...prev, memo: e.target.value}))} placeholder="攻略のポイントや感想などを自由に記録..." className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none min-h-[80px]" /></div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition flex items-center justify-center gap-2">{isSubmitting ? (<span className="animate-pulse">保存中...</span>) : (<><Save size={20} />{initialData ? '更新を保存' : '記録を保存'}</>)}</button>
        <div className="h-8"></div>
      </form>

      {/* Generic Add Modal */}
      <AddOptionModal 
        isOpen={activeModal !== null} 
        onClose={() => setActiveModal(null)} 
        onAdd={(name) => {
          if (activeModal === 'store') {
            onAddStore(name);
            setFormData(prev => ({ ...prev, storeName: name }));
          } else if (activeModal === 'series') {
            onAddSeries(name);
            setFormData(prev => ({ ...prev, seriesName: name }));
          } else if (activeModal === 'setting') {
            onAddSetting(name);
            setFormData(prev => ({ ...prev, settingName: name }));
          } else if (activeModal === 'finish') {
            onAddFinish(name);
            setFormData(prev => ({ ...prev, finishType: name }));
          }
          setActiveModal(null);
        }}
        title={
          activeModal === 'store' ? '新しい店名を追加' :
          activeModal === 'series' ? '新しいシリーズを追加' :
          activeModal === 'setting' ? '新しい設定を追加' :
          activeModal === 'finish' ? '新しい決め手を追加' : ''
        }
        placeholder={
          activeModal === 'store' ? '例: タイトーステーション' :
          activeModal === 'series' ? '例: ワーコレ' :
          activeModal === 'setting' ? '例: 橋渡し' :
          activeModal === 'finish' ? '例: ちゃぶ台返し' : ''
        }
      />
    </div>
  );
};

// 12. SettingsView (Same as before)
const SettingsView = ({ onBack, onDataChanged }: { onBack: () => void, onDataChanged: () => Promise<void> }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (Export/Import/Reset logic remains same, but need to handle new stores if exporting/importing V2 data structure)
  // For simplicity, using getAll on objectStoreNames can dynamically fetch all stores.
  // But here we'll explicitly list them for clarity.

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const db = await openDB();
      const tx = db.transaction(['records', 'store_options', 'series_options', 'setting_options', 'finish_options'], 'readonly');
      
      const getAllFromStore = (storeName: string) => {
        return new Promise<any[]>((resolve) => {
          const req = tx.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result);
        });
      };

      const [records, stores, series, settings, finishes] = await Promise.all([
        getAllFromStore('records'),
        getAllFromStore('store_options'),
        getAllFromStore('series_options'),
        getAllFromStore('setting_options'),
        getAllFromStore('finish_options')
      ]);

      const exportData = { 
        app: 'CraneGameLog', 
        version: 2, 
        exportedAt: Date.now(), 
        records, 
        stores,
        series,
        settings,
        finishes
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crelog_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('バックアップファイルを保存しました。');
    } catch (e) {
      console.error(e);
      alert('エクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('現在のデータにバックアップデータを上書き・統合しますか？\n（IDが重複するデータは上書きされます）')) { e.target.value = ''; return; }
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.app !== 'CraneGameLog' || !Array.isArray(data.records)) { throw new Error('無効なファイル形式です'); }
      
      const db = await openDB();
      const tx = db.transaction(['records', 'store_options', 'series_options', 'setting_options', 'finish_options'], 'readwrite');
      
      data.records.forEach((r: any) => tx.objectStore('records').put(r));
      if (Array.isArray(data.stores)) data.stores.forEach((s: any) => tx.objectStore('store_options').put(s));
      if (Array.isArray(data.series)) data.series.forEach((s: any) => tx.objectStore('series_options').put(s));
      if (Array.isArray(data.settings)) data.settings.forEach((s: any) => tx.objectStore('setting_options').put(s));
      if (Array.isArray(data.finishes)) data.finishes.forEach((s: any) => tx.objectStore('finish_options').put(s));

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
      await onDataChanged();
      alert('復元が完了しました。');
    } catch (e) {
      console.error(e);
      alert('復元に失敗しました。ファイルが正しいか確認してください。');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = async () => {
    if (window.confirm('【警告】すべてのデータを削除します。\nこの操作は取り消せません。本当によろしいですか？')) {
      if (window.confirm('本当に削除してよろしいですか？')) {
        try {
          const db = await openDB();
          const tx = db.transaction(['records', 'store_options', 'series_options', 'setting_options', 'finish_options'], 'readwrite');
          tx.objectStore('records').clear();
          tx.objectStore('store_options').clear();
          tx.objectStore('series_options').clear();
          tx.objectStore('setting_options').clear();
          tx.objectStore('finish_options').clear();
          await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
          await onDataChanged();
          alert('すべてのデータを削除しました。');
        } catch(e) {
          console.error(e);
          alert('削除に失敗しました。');
        }
      }
    }
  };

  return (
    <div className="bg-white min-h-full">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} className="text-gray-600" /></button>
        <h2 className="text-lg font-bold text-gray-800">設定・データ管理</h2>
      </div>
      <div className="p-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><Save size={16} /> バックアップと復元</h3>
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed">記録したデータをファイル（JSON形式）として保存します。<br/>機種変更時や、万が一のデータ消失に備えて定期的な保存をおすすめします。</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExport} disabled={isExporting} className="flex flex-col items-center justify-center p-4 bg-white border-2 border-blue-100 rounded-xl text-blue-600 font-bold text-sm hover:bg-blue-50 transition active:scale-95 shadow-sm"><Download size={24} className="mb-2" />{isExporting ? '保存中...' : 'データを保存'}</button>
              <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex flex-col items-center justify-center p-4 bg-white border-2 border-green-100 rounded-xl text-green-600 font-bold text-sm hover:bg-green-50 transition active:scale-95 shadow-sm"><Upload size={24} className="mb-2" />{isImporting ? '読込中...' : 'データを復元'}</button>
              <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
          </div>
        </section>
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2"><AlertCircle size={16} /> データ管理</h3>
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
            <button onClick={handleResetData} className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm shadow-sm hover:bg-red-50 transition active:scale-95"><Trash2 size={18} />全データを削除する</button>
            <p className="text-[10px] text-red-400 mt-2 text-center">※この操作は取り消せません。事前にバックアップを取ることを推奨します。</p>
          </div>
        </section>
        <section className="text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3"><Gamepad2 size={24} className="text-gray-400" /></div>
          <h4 className="font-bold text-gray-400 text-sm">クレログ</h4>
          <p className="text-xs text-gray-300 mt-1">Version 1.2.0 (Offline Mode)</p>
        </section>
      </div>
    </div>
  );
};

// 13. CraneGameLog (Main Component)
export default function CraneGameLog() {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<OptionItem[]>([]);
  const [settingOptions, setSettingOptions] = useState<OptionItem[]>([]);
  const [finishOptions, setFinishOptions] = useState<OptionItem[]>([]);

  const [view, setView] = useState<'history' | 'add' | 'stats' | 'settings'>('history');
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<GameRecord | null>(null);
  
  // Initialize formData with localStorage data if available
  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingView, setPendingView] = useState<'history' | 'add' | 'stats' | 'settings' | null>(null);

  useEffect(() => {
    // ... PWA & Mobile Optimization Effects (Same as before)
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' },
      { name: 'theme-color', content: '#f3f4f6' }
    ];
    metaTags.forEach(tag => {
      let element = document.querySelector(`meta[name="${tag.name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('name', tag.name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });

    const style = document.createElement('style');
    style.textContent = `
      body, html {
        overscroll-behavior-y: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }
      input, textarea, select {
        user-select: text;
        -webkit-user-select: text;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);

    const setHeight = () => { setViewportHeight(`${window.innerHeight}px`); };
    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);

    return () => {
      document.head.removeChild(style);
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['records', 'store_options', 'series_options', 'setting_options', 'finish_options'], 'readonly');
      
      const getAllFromStore = (storeName: string) => {
        return new Promise<any[]>((resolve) => {
          const req = transaction.objectStore(storeName).getAll();
          req.onsuccess = () => resolve(req.result);
        });
      };

      const [recs, stores, series, settings, finishes] = await Promise.all([
        getAllFromStore('records'),
        getAllFromStore('store_options'),
        getAllFromStore('series_options'),
        getAllFromStore('setting_options'),
        getAllFromStore('finish_options')
      ]);

      setRecords(recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt));
      setStoreOptions(stores.sort((a, b) => a.createdAt - b.createdAt));
      setSeriesOptions(series.sort((a, b) => a.createdAt - b.createdAt));
      setSettingOptions(settings.sort((a, b) => a.createdAt - b.createdAt));
      setFinishOptions(finishes.sort((a, b) => a.createdAt - b.createdAt));
      
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch data:", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStore = async (store: StoreOption) => {
    try {
      const db = await openDB();
      const tx = db.transaction('store_options', 'readwrite');
      const storeObj = tx.objectStore('store_options');
      await storeObj.put(store);
      await new Promise(resolve => { tx.oncomplete = resolve; });
      await fetchData();
    } catch (e) {
      console.error("Error updating store: ", e);
      alert("店舗情報の更新に失敗しました。");
    }
  };

  const handleNavigation = (targetView: 'history' | 'add' | 'stats' | 'settings') => {
    if (view === 'add') {
      const isNewAndDirty = !editingRecord && (formData.prizeName !== '' || formData.moves > 1 || formData.photoUrl !== null);
      const shouldConfirm = editingRecord ? true : isNewAndDirty;
      if (shouldConfirm) {
        setPendingView(targetView);
        setShowConfirmDialog(true);
      } else {
        setFormData(getInitialFormData()); 
        setEditingRecord(null);
        setView(targetView);
      }
    } else {
      setView(targetView);
    }
  };

  const confirmNavigation = () => {
    if (pendingView) {
      setFormData(getInitialFormData()); 
      setEditingRecord(null);
      setView(pendingView);
      setPendingView(null);
    }
    setShowConfirmDialog(false);
  };

  const handleSaveRecord = async (recordData: Omit<GameRecord, 'id' | 'createdAt'>) => {
    try {
      const db = await openDB();
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      if (editingRecord) {
        await store.put({ ...recordData, id: editingRecord.id, createdAt: editingRecord.createdAt });
        setEditingRecord(null);
      } else {
        await store.add({ ...recordData, id: crypto.randomUUID(), createdAt: Date.now() });
      }
      await new Promise(resolve => { tx.oncomplete = resolve; });
      
      // Save last config to localStorage
      const configToSave = {
        storeName: recordData.storeName,
        costPerPlay: recordData.costPerPlay,
        seriesName: recordData.seriesName,
        settingName: recordData.settingName
      };
      localStorage.setItem('crelog_last_config', JSON.stringify(configToSave));

      await fetchData();
      setView('history');
      setFormData(getInitialFormData());
    } catch (e) {
      console.error("Error saving document: ", e);
      alert("保存に失敗しました。");
    }
  };

  const handleAddOption = async (name: string, storeName: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await store.add({ id: crypto.randomUUID(), name: name.trim(), createdAt: Date.now() });
      await new Promise(resolve => { tx.oncomplete = resolve; });
      await fetchData();
    } catch (e) {
      console.error("Error adding option: ", e);
      alert("追加に失敗しました。");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("この記録を削除しますか？")) return;
    try {
      const db = await openDB();
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      await store.delete(id);
      await new Promise(resolve => { tx.oncomplete = resolve; });
      await fetchData();
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const handleEditClick = (record: GameRecord) => {
    setEditingRecord(record);
    setFormData({ 
      ...BASE_FORM_DATA, 
      ...record, 
      assistAt: record.assistAt === null ? undefined : record.assistAt, 
      events: record.events || [],
      seriesName: record.seriesName || '',
      settingName: record.settingName || '',
      finishType: record.finishType || ''
    });
    setView('add');
  };
  
  const handleCancelForm = () => { handleNavigation('history'); }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-gray-100 max-w-md mx-auto shadow-2xl overflow-hidden font-sans" style={{ height: viewportHeight }}>
      <IOSInstallPrompt />
      <ConfirmationModal isOpen={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} onConfirm={confirmNavigation} message="入力中のデータがあります。破棄して移動してもよろしいですか？" />
      
      <header className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-md z-10 shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2"><Gamepad2 className="w-6 h-6" />クレログ</h1>
          <div className="flex items-center gap-2">
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">{records.length} プレイ</div>
            <button onClick={() => handleNavigation('settings')} className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition text-white"><Settings size={18} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar w-full bg-gray-100">
        <div className="pb-4">
          {view === 'history' && <HistoryContainer records={records} onDelete={handleDeleteRecord} onEdit={handleEditClick} onAdd={() => { setEditingRecord(null); setFormData(getInitialFormData()); setView('add'); }} />}
          {view === 'add' && <AddForm 
            initialData={editingRecord} 
            storeOptions={storeOptions} 
            seriesOptions={seriesOptions}
            settingOptions={settingOptions}
            finishOptions={finishOptions}
            onSave={handleSaveRecord} 
            onAddStore={(name) => handleAddOption(name, 'store_options')}
            onAddSeries={(name) => handleAddOption(name, 'series_options')}
            onAddSetting={(name) => handleAddOption(name, 'setting_options')}
            onAddFinish={(name) => handleAddOption(name, 'finish_options')}
            onCancel={handleCancelForm} 
            viewportHeight={viewportHeight} 
            formData={formData} 
            setFormData={setFormData} 
          />}
          {view === 'stats' && <StatsView records={records} storeOptions={storeOptions} onUpdateStore={handleUpdateStore} />}
          {view === 'settings' && <SettingsView onBack={async () => { await fetchData(); handleNavigation('history'); }} onDataChanged={fetchData} />}
        </div>
      </main>

      {view !== 'settings' && (
        <nav className="shrink-0 w-full bg-white border-t border-gray-200 z-20 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-end h-16 w-full max-w-md mx-auto relative">
            <NavButton active={view === 'history'} onClick={() => handleNavigation('history')} icon={<History size={24} />} label="履歴" />
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
              <button onClick={() => { if (view !== 'add') { setEditingRecord(null); setFormData(getInitialFormData()); setView('add'); } }} className="bg-gradient-to-tr from-pink-500 to-purple-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform transition active:scale-95 flex items-center justify-center border-4 border-gray-100"><Plus size={28} strokeWidth={2.5} /></button>
            </div>
            <div className="w-12"></div>
            <NavButton active={view === 'stats'} onClick={() => handleNavigation('stats')} icon={<BarChart3 size={24} />} label="分析" />
          </div>
        </nav>
      )}
    </div>
  );
}
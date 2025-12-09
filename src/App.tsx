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
  RefreshCw
} from 'lucide-react';

// --- Types ---
type PlayEvent = {
  type: 'assist' | 'reset';
  move: number;
  timestamp?: number;
};

type Record = {
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
  createdAt: number;
};

type StoreOption = {
  id: string;
  name: string;
  createdAt: number;
};

// --- IndexedDB Helper (Local Database) ---
const DB_NAME = 'CraneGameLogDB';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('store_options')) {
        db.createObjectStore('store_options', { keyPath: 'id' });
      }
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

// --- Components ---

// iOS Install Prompt Component
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
    <div className="fixed bottom-20 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-gray-800">ホーム画面に追加してアプリ化</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        Safariの「シェア <Share size={12} className="inline"/>」ボタンから<br/>
        「ホーム画面に追加 <PlusSquare size={12} className="inline"/>」を選択すると<br/>
        全画面で快適に利用できます。
      </p>
      <div className="flex justify-center">
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/90 absolute -bottom-2"></div>
      </div>
    </div>
  );
};

// --- Settings View ---
const SettingsView = ({ onBack, onDataChanged }: { onBack: () => void, onDataChanged: () => Promise<void> }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const db = await openDB();
      const recordsTx = db.transaction('records', 'readonly');
      const records = await new Promise<any[]>((resolve) => {
        const req = recordsTx.objectStore('records').getAll();
        req.onsuccess = () => resolve(req.result);
      });
      const storesTx = db.transaction('store_options', 'readonly');
      const stores = await new Promise<any[]>((resolve) => {
        const req = storesTx.objectStore('store_options').getAll();
        req.onsuccess = () => resolve(req.result);
      });
      const exportData = { app: 'CraneGameLog', version: 1, exportedAt: Date.now(), records, stores };
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

    if (!window.confirm('現在のデータにバックアップデータを上書き・統合しますか？\n（IDが重複するデータは上書きされます）')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        throw new Error('ファイルが破損しているか、JSON形式ではありません。');
      }

      if (!data || data.app !== 'CraneGameLog' || !Array.isArray(data.records)) {
        throw new Error('クレログのバックアップファイルではないようです。');
      }

      const db = await openDB();
      const tx = db.transaction(['records', 'store_options'], 'readwrite');
      const recordsStore = tx.objectStore('records');
      const storesStore = tx.objectStore('store_options');

      let recordCount = 0;
      data.records.forEach((r: any) => {
        recordsStore.put(r);
        recordCount++;
      });

      if (Array.isArray(data.stores)) {
        data.stores.forEach((s: any) => storesStore.put(s));
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });
      
      await onDataChanged();
      alert(`復元が完了しました。\n（復元された記録: ${recordCount}件）`);
    } catch (e: any) {
      console.error(e);
      alert(`復元に失敗しました。\nエラー: ${e.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = async () => {
    if (window.confirm('【警告】すべてのプレイ記録と店名データを削除します。\nこの操作は取り消せません。本当によろしいですか？')) {
      if (window.confirm('本当に削除してよろしいですか？')) {
        try {
          const db = await openDB();
          const tx = db.transaction(['records', 'store_options'], 'readwrite');
          tx.objectStore('records').clear();
          tx.objectStore('store_options').clear();
          await new Promise<void>(resolve => { 
             tx.oncomplete = () => resolve(); 
             tx.onerror = () => resolve(); 
          });
          
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
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
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
          <p className="text-xs text-gray-300 mt-1">Version 1.0.0 (Offline Mode)</p>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  const [records, setRecords] = useState<Record[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [view, setView] = useState<'history' | 'add' | 'stats' | 'settings'>('history');
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);

  // --- PWA & Mobile Optimization Effects ---
  useEffect(() => {
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

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // --- Data Fetching from IndexedDB ---
  const fetchData = useCallback(async () => {
    try {
      const db = await openDB();
      
      const transaction = db.transaction(['records', 'store_options'], 'readonly');
      
      const recordsStore = transaction.objectStore('records');
      const recordsReq = recordsStore.getAll();
      
      const storesStore = transaction.objectStore('store_options');
      const storesReq = storesStore.getAll();

      return new Promise<void>((resolve) => {
        transaction.oncomplete = () => {
          const sortedRecords = (recordsReq.result as Record[]).sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
          );
          setRecords(sortedRecords);

          const sortedStores = (storesReq.result as StoreOption[]).sort((a, b) => a.createdAt - b.createdAt);
          setStoreOptions(sortedStores);
          
          setLoading(false);
          resolve();
        };
      });
    } catch (e) {
      console.error("Failed to fetch data:", e);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Operations ---
  const handleSaveRecord = async (recordData: Omit<Record, 'id' | 'createdAt'>) => {
    try {
      const db = await openDB();
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');

      if (editingRecord) {
        await store.put({
          ...recordData,
          id: editingRecord.id,
          createdAt: editingRecord.createdAt
        });
        setEditingRecord(null);
      } else {
        await store.add({
          ...recordData,
          id: crypto.randomUUID(),
          createdAt: Date.now()
        });
      }

      await new Promise(resolve => { tx.oncomplete = resolve; });
      await fetchData();
      setView('history');
    } catch (e) {
      console.error("Error saving document: ", e);
      alert("保存に失敗しました。");
    }
  };

  const handleAddStore = async (storeName: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction('store_options', 'readwrite');
      const store = tx.objectStore('store_options');
      
      await store.add({
        id: crypto.randomUUID(),
        name: storeName.trim(),
        createdAt: Date.now()
      });

      await new Promise(resolve => { tx.oncomplete = resolve; });
      await fetchData();
    } catch (e) {
      console.error("Error adding store: ", e);
      alert("店名の追加に失敗しました。");
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

  const handleEditClick = (record: Record) => {
    setEditingRecord(record);
    setView('add');
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gray-50 text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-100 max-w-md mx-auto shadow-2xl overflow-hidden font-sans">
      <IOSInstallPrompt />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-md z-10 shrink-0">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-6 h-6" />
            クレログ
          </h1>
          <div className="flex items-center gap-2">
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {records.length} プレイ
            </div>
            <button 
              onClick={() => setView('settings')}
              className="p-1.5 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar relative w-full">
        {view === 'history' && (
          <HistoryContainer 
            records={records} 
            onDelete={handleDeleteRecord} 
            onEdit={handleEditClick} 
            onAdd={() => {
              setEditingRecord(null);
              setView('add');
            }} 
          />
        )}
        {view === 'add' && (
          <AddForm 
            initialData={editingRecord}
            storeOptions={storeOptions}
            onSave={handleSaveRecord} 
            onAddStore={handleAddStore}
            onCancel={() => {
              setEditingRecord(null);
              setView('history');
            }} 
          />
        )}
        {view === 'stats' && (
          <StatsView records={records} />
        )}
        {view === 'settings' && (
          <SettingsView 
            onBack={async () => {
              await fetchData(); 
              setView('history');
            }} 
            onDataChanged={fetchData}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      {view !== 'settings' && (
        <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full max-w-md flex justify-around items-end h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-20">
          <div className="flex justify-around items-center w-full h-16">
            <NavButton 
              active={view === 'history'} 
              onClick={() => {
                setEditingRecord(null);
                setView('history');
              }} 
              icon={<History size={24} />} 
              label="履歴" 
            />
            <div className="relative -top-5">
              <button 
                onClick={() => {
                  setEditingRecord(null);
                  setView('add');
                }}
                className="bg-gradient-to-tr from-pink-500 to-purple-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform transition hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <Plus size={28} strokeWidth={2.5} />
              </button>
            </div>
            <NavButton 
              active={view === 'stats'} 
              onClick={() => {
                setEditingRecord(null);
                setView('stats');
              }} 
              icon={<BarChart3 size={24} />} 
              label="分析" 
            />
          </div>
        </nav>
      )}
    </div>
  );
}

// --- Sub Components ---

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active ? 'text-purple-600' : 'text-gray-400'}`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const HistoryContainer = ({ records, onDelete, onEdit, onAdd }: { records: Record[], onDelete: (id: string) => void, onEdit: (r: Record) => void, onAdd: () => void }) => {
  const [mode, setMode] = useState<'list' | 'calendar'>('list');

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button 
            onClick={() => setMode('list')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${mode === 'list' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}
          >
            <LayoutList size={16} />
            リスト
          </button>
          <button 
            onClick={() => setMode('calendar')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition ${mode === 'calendar' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}
          >
            <CalendarDays size={16} />
            カレンダー
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {mode === 'list' ? (
          <ListView records={records} onDelete={onDelete} onEdit={onEdit} onAdd={onAdd} />
        ) : (
          <CalendarView records={records} onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </div>
  );
};

const CalendarView = ({ records, onEdit, onDelete }: { records: Record[], onEdit: (r: Record) => void, onDelete: (id: string) => void }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{date: string, records: Record[]} | null>(null);

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
  }, {} as Record<number, { cost: number, count: number, records: Record[] }>);

  const handleDayClick = (day: number, dailyRecords: Record[]) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay({ date: dateStr, records: dailyRecords });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-bold text-gray-800">{year}年 {month + 1}月</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronRight size={24} /></button>
      </div>
      <div className="mb-4 bg-pink-50 rounded-lg p-3 flex justify-between items-center text-sm">
        <span className="text-gray-600 font-bold">今月の合計</span>
        <span className="text-xl font-black text-pink-600">¥{Object.values(dailyTotals).reduce((sum, d) => sum + d.cost, 0).toLocaleString()}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={i} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`blank-${i}`} className="aspect-square bg-gray-50 rounded-md" />)}
        {days.map((day) => {
          const data = dailyTotals[day];
          const hasData = !!data;
          let bgClass = "bg-white border-gray-100";
          if (hasData) {
            if (data.cost > 5000) bgClass = "bg-pink-200 border-pink-300";
            else if (data.cost > 2000) bgClass = "bg-pink-100 border-pink-200";
            else bgClass = "bg-pink-50 border-pink-100";
          }
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          return (
            <div 
              key={day} 
              onClick={() => handleDayClick(day, data?.records || [])}
              className={`aspect-square rounded-lg border p-1 flex flex-col justify-between relative overflow-hidden cursor-pointer active:scale-95 transition ${bgClass} ${isToday ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
            >
              <span className={`text-xs font-bold ${isToday ? 'text-purple-600' : 'text-gray-500'}`}>{day}</span>
              {hasData && <div className="text-[9px] font-bold text-gray-700 text-right leading-tight">¥{data.cost.toLocaleString()}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-gray-500 mb-2">今月の詳細</h3>
        {Object.keys(dailyTotals).length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-4">この月の記録はありません</div>
        ) : (
          <div className="text-xs text-gray-400 text-center py-2">日付をタップすると詳細が表示されます</div>
        )}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={() => setSelectedDay(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-10 duration-200 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-gray-800">
                  {new Date(selectedDay.date).toLocaleDateString('ja-JP', {year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'})}
                </h3>
                <span className="text-xs text-gray-500">
                  合計: ¥{selectedDay.records.reduce((sum, r) => sum + r.totalCost, 0).toLocaleString()}
                </span>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {selectedDay.records.length > 0 ? (
                selectedDay.records.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100">
                        {record.photoUrl ? (
                          <img src={record.photoUrl} alt={record.prizeName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={16} /></div>
                        )}
                        <div className={`absolute bottom-0 w-full h-1 ${record.result === 'win' ? 'bg-yellow-400' : 'bg-blue-300'}`}></div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{record.prizeName}</h4>
                          <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={8} /> {record.storeName}</p>
                        </div>
                        <div className="flex justify-between items-end mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${record.result === 'win' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                              {record.result === 'win' ? 'GET' : '撤退'}
                            </span>
                            <span className="text-xs font-bold text-gray-700">¥{record.totalCost.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { onEdit(record); setSelectedDay(null); }} className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-white rounded-lg transition"><Edit size={14} /></button>
                            <button onClick={() => onDelete(record.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {record.memo && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex gap-2">
                        <FileText size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-gray-600 line-clamp-2">{record.memo}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">記録はありません</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlayModeOverlay = ({ 
  moves, 
  events, 
  onIncrement, 
  onDecrement, 
  onEvent, 
  onClose 
}: { 
  moves: number, 
  events: PlayEvent[], 
  onIncrement: () => void, 
  onDecrement: () => void, 
  onEvent: (type: 'assist' | 'reset') => void,
  onClose: () => void 
}) => {
  const [confirmType, setConfirmType] = useState<'assist' | 'reset' | null>(null);

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]">
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
                <span key={i} className={`text-[10px] px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1 ${ev.type === 'assist' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  {ev.type === 'assist' ? <HelpingHand size={10} /> : <RefreshCcw size={10} />}
                  {ev.move}手
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 h-48 flex-shrink-0">
          <button onClick={onIncrement} className="col-span-2 bg-pink-500 text-white rounded-2xl shadow-xl active:bg-pink-600 active:scale-[0.98] transition flex items-center justify-center gap-4 group">
            <Plus size={48} className="group-active:scale-125 transition duration-150" />
            <span className="text-3xl font-black">カウント</span>
          </button>
          <button onClick={() => setConfirmType('reset')} className="bg-blue-50 border-2 border-blue-100 text-blue-600 rounded-xl active:bg-blue-100 transition flex flex-col items-center justify-center gap-1">
            <RefreshCcw size={28} />
            <span className="font-bold text-sm">初期位置</span>
          </button>
          <button onClick={() => setConfirmType('assist')} className="bg-green-50 border-2 border-green-100 text-green-600 rounded-xl active:bg-green-100 transition flex flex-col items-center justify-center gap-1">
            <HelpingHand size={28} />
            <span className="font-bold text-sm">アシスト</span>
          </button>
        </div>
      </div>
      {confirmType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200 text-center">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmType === 'assist' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {confirmType === 'assist' ? <HelpingHand size={24} /> : <RefreshCcw size={24} />}
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">{confirmType === 'assist' ? 'アシストを記録しますか？' : '初期位置に戻しますか？'}</h3>
            <p className="text-sm text-gray-500 mb-6">現在の「{moves}手目」に<br/>{confirmType === 'assist' ? '店員さんのアシスト' : '位置のリセット'}があったことを記録します。</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmType(null)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 hover:bg-gray-200 rounded-xl transition">キャンセル</button>
              <button onClick={() => { onEvent(confirmType); setConfirmType(null); }} className={`flex-1 py-3 text-white font-bold text-sm rounded-xl shadow-lg transition active:scale-95 ${confirmType === 'assist' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>記録する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddForm = ({ initialData, storeOptions, onSave, onAddStore, onCancel }: { initialData?: Record | null, storeOptions: StoreOption[], onSave: (r: any) => void, onAddStore: (name: string) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    storeName: initialData?.storeName || '',
    prizeName: initialData?.prizeName || '',
    costPerPlay: initialData?.costPerPlay || 100,
    moves: initialData?.moves || 1,
    result: initialData?.result || ('win' as 'win' | 'lose'),
    photoUrl: initialData?.photoUrl || null,
    startType: initialData?.startType || 'initial' as 'initial' | 'continuation',
    events: initialData?.events || [] as PlayEvent[],
    memo: initialData?.memo || '',
    hasAssist: initialData?.hasAssist || false,
    assistAt: initialData?.assistAt || undefined as number | undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [isPlayMode, setIsPlayMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCost = formData.costPerPlay * formData.moves;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const resized = await resizeImage(e.target.files[0]);
        setFormData({ ...formData, photoUrl: resized });
      } catch (err) {
        console.error("Image processing failed", err);
        alert("画像の処理に失敗しました。");
      }
    }
  };

  const handleAddStoreClick = () => {
    setNewStoreName('');
    setIsStoreModalOpen(true);
  };

  const handleConfirmAddStore = () => {
    if (newStoreName.trim()) {
      onAddStore(newStoreName.trim());
      setFormData(prev => ({ ...prev, storeName: newStoreName.trim() }));
      setIsStoreModalOpen(false);
    }
  };

  const handlePlayIncrement = () => {
    setFormData(prev => ({ ...prev, moves: prev.moves + 1 }));
  };
  const handlePlayDecrement = () => {
    setFormData(prev => ({ ...prev, moves: Math.max(1, prev.moves - 1) }));
  };
  const handlePlayEvent = (type: 'assist' | 'reset') => {
    const currentMove = formData.moves;
    const newEvent: PlayEvent = { type, move: currentMove, timestamp: Date.now() };
    
    setFormData(prev => {
      const next = { ...prev, events: [...prev.events, newEvent] };
      if (type === 'assist') {
        next.hasAssist = true;
        next.assistAt = currentMove;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prizeName) {
      alert("景品名を入力してください");
      return;
    }
    if (!formData.storeName) {
      alert("店名を選択してください");
      return;
    }
    setIsSubmitting(true);
    
    const dataToSave = {
      ...formData,
      totalCost,
      assistAt: formData.assistAt === undefined ? null : formData.assistAt
    };

    await onSave(dataToSave);
    setIsSubmitting(false);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-full">
      {isPlayMode && (
        <PlayModeOverlay 
          moves={formData.moves}
          events={formData.events}
          onIncrement={handlePlayIncrement}
          onDecrement={handlePlayDecrement}
          onEvent={handlePlayEvent}
          onClose={() => setIsPlayMode(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">{initialData ? '記録を編集' : '新規記録'}</h2>
        <button onClick={onCancel} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Play Mode Trigger Button */}
        <button
          type="button"
          onClick={() => setIsPlayMode(true)}
          className="w-full bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between group active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Gamepad2 size={24} className="text-white" />
            </div>
            <div className="text-left">
              <div className="text-xs text-gray-300 font-bold uppercase">集中モード</div>
              <div className="text-lg font-bold">プレイを開始</div>
            </div>
          </div>
          <ChevronRight className="text-gray-400 group-hover:text-white transition" />
        </button>

        {/* Photo Upload */}
        <div className="flex justify-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-48 bg-white border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition relative overflow-hidden group"
          >
            {formData.photoUrl ? (
              <>
                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="text-white font-bold">写真を変更</span>
                </div>
              </>
            ) : (
              <>
                <Camera size={40} className="text-gray-300 mb-2" />
                <span className="text-sm text-gray-400 font-medium">写真をタップして追加</span>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </div>

        {/* Result Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({...formData, result: 'win'})}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${
              formData.result === 'win' 
                ? 'border-yellow-400 bg-yellow-50 text-yellow-700 shadow-sm' 
                : 'border-gray-200 bg-white text-gray-400'
            }`}
          >
            <Trophy size={28} className={formData.result === 'win' ? 'text-yellow-500' : ''} />
            <span className="font-bold">GET!</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData({...formData, result: 'lose'})}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${
              formData.result === 'lose' 
                ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm' 
                : 'border-gray-200 bg-white text-gray-400'
            }`}
          >
            <Frown size={28} className={formData.result === 'lose' ? 'text-blue-500' : ''} />
            <span className="font-bold">撤退...</span>
          </button>
        </div>

        {/* Details Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">日付</label>
            <div className="relative">
              <input 
                type="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-pink-500 focus:outline-none"
              />
              <CalendarIcon size={18} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">景品名</label>
            <input 
              type="text" 
              required
              placeholder="例: ちいかわ ぬいぐるみ"
              value={formData.prizeName}
              onChange={(e) => setFormData({...formData, prizeName: e.target.value})}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">店名</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={formData.storeName}
                  onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 pl-10 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  <option value="" disabled>店名を選択</option>
                  {storeOptions.map(store => (
                    <option key={store.id} value={store.name}>{store.name}</option>
                  ))}
                  {formData.storeName && !storeOptions.some(s => s.name === formData.storeName) && (
                    <option value={formData.storeName}>{formData.storeName}</option>
                  )}
                </select>
                <Store size={18} className="absolute left-3 top-3.5 text-gray-400" />
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                </div>
              </div>
              <button 
                type="button"
                onClick={handleAddStoreClick}
                className="bg-purple-100 text-purple-600 p-3 rounded-lg hover:bg-purple-200 transition flex items-center justify-center shadow-sm"
                title="新しい店名を追加"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Play Details & Cost Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase">プレイ状況</label>
             <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, startType: 'initial'})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${formData.startType === 'initial' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-400'}`}
                >
                  初期位置から
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, startType: 'continuation'})}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${formData.startType === 'continuation' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-200 text-gray-400'}`}
                >
                  途中から
                </button>
             </div>
             
             {/* イベントログ表示 */}
             {formData.events.length > 0 && (
                <div className="space-y-1 mb-2">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">イベント履歴</div>
                  {formData.events.map((ev, i) => (
                    <div key={i} className="flex justify-between text-xs bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="flex items-center gap-1 font-bold text-gray-700">
                        {ev.type === 'assist' ? <HelpingHand size={12} className="text-green-500"/> : <RefreshCcw size={12} className="text-blue-500"/>}
                        {ev.type === 'assist' ? 'アシスト' : '初期位置'}
                      </span>
                      <span>{ev.move}手目</span>
                    </div>
                  ))}
                </div>
             )}
          </div>

          <div className="border-t border-gray-100 my-2"></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">1PLAY料金</label>
              <div className="relative">
                <select 
                  value={formData.costPerPlay}
                  onChange={(e) => setFormData({...formData, costPerPlay: Number(e.target.value)})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 appearance-none focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  <option value="100">100円</option>
                  <option value="200">200円</option>
                  <option value="10">10円</option>
                  <option value="300">300円</option>
                </select>
                <DollarSign size={14} className="absolute right-3 top-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">手数</label>
              <div className="flex items-center">
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, moves: Math.max(1, prev.moves - 1)}))}
                  className="w-10 h-10 bg-gray-100 rounded-l-lg flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min="1"
                  value={formData.moves}
                  onChange={(e) => setFormData({...formData, moves: Math.max(1, Number(e.target.value))})}
                  className="w-full h-10 text-center bg-white border-y border-gray-200 focus:outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, moves: prev.moves + 1}))}
                  className="w-10 h-10 bg-gray-100 rounded-r-lg flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500">合計金額</span>
            <span className="text-2xl font-black text-pink-600">¥{totalCost.toLocaleString()}</span>
          </div>
        </div>

        {/* Memo Field */}
        <div className="bg-white p-5 rounded-2xl shadow-sm space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase">メモ</label>
          <textarea
            value={formData.memo}
            onChange={(e) => setFormData({...formData, memo: e.target.value})}
            placeholder="攻略のポイントや感想などを自由に記録..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none min-h-[80px]"
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform active:scale-95 transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="animate-pulse">保存中...</span>
          ) : (
            <>
              <Save size={20} />
              {initialData ? '更新を保存' : '記録を保存'}
            </>
          )}
        </button>
        <div className="h-8"></div>
      </form>

      {/* Store Add Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Store size={20} className="text-purple-500" />
              新しい店名を追加
            </h3>
            <input
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="例: タイトーステーション"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6 focus:ring-2 focus:ring-pink-500 focus:outline-none text-base"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmAddStore}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition transform active:scale-95"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatsView = ({ records }: { records: Record[] }) => {
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [targetDate, setTargetDate] = useState(new Date());

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
  
  // Win stats
  const winRecords = filteredRecords.filter(r => r.result === 'win');
  const winTotalSpent = winRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const winCount = winRecords.length;
  const winAvg = winCount > 0 ? Math.round(winTotalSpent / winCount) : 0;

  // Lose stats
  const loseRecords = filteredRecords.filter(r => r.result === 'lose');
  const loseTotalSpent = loseRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const loseCount = loseRecords.length;
  const loseAvg = loseCount > 0 ? Math.round(loseTotalSpent / loseCount) : 0;

  const winRate = filteredRecords.length > 0 ? Math.round((winCount / filteredRecords.length) * 100) : 0;
  const avgCostPerWin = winRecords.length > 0 ? Math.round(winRecords.reduce((sum, r) => sum + r.totalCost, 0) / winRecords.length) : 0;
  const recentWins = filteredRecords.filter(r => r.result === 'win' && r.photoUrl).slice(0, 6);

  return (
    <div className="p-5 space-y-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">戦績レポート</h2>
      
      {/* 期間選択タブ */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
        {(['day', 'month', 'year', 'all'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setPeriodType(type)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              periodType === type ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {type === 'day' && '日'}
            {type === 'month' && '月'}
            {type === 'year' && '年'}
            {type === 'all' && '全期間'}
          </button>
        ))}
      </div>

      {/* 日付ナビゲーター (全期間以外で表示) */}
      {periodType !== 'all' && (
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-4">
          <button onClick={() => movePeriod(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-gray-700">{formatDateLabel()}</span>
          <button onClick={() => movePeriod(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">総使用金額</div>
          <div className="text-2xl font-black text-gray-800">¥{totalSpent.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 font-bold uppercase mb-1">獲得率</div>
          <div className="text-2xl font-black text-gray-800">{winRate}<span className="text-sm font-normal text-gray-400">%</span></div>
        </div>
      </div>

      {/* Win Stats Card */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
        <h3 className="text-yellow-800 font-bold flex items-center gap-2 mb-3">
          <Trophy size={18} className="fill-yellow-600 text-yellow-600" /> 獲得 (Win)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-yellow-600 font-bold mb-1">獲得総額</div>
            <div className="text-xl font-black text-yellow-900">¥{winTotalSpent.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-yellow-600 font-bold mb-1">平均/個</div>
            <div className="text-xl font-black text-yellow-900">¥{winAvg.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-right text-xs text-yellow-700 mt-2 font-medium border-t border-yellow-200 pt-2">
          {winCount} 個獲得
        </div>
      </div>

      {/* Lose Stats Card */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <h3 className="text-blue-800 font-bold flex items-center gap-2 mb-3">
          <Frown size={18} className="text-blue-600" /> 撤退 (Lose)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-blue-600 font-bold mb-1">撤退総額</div>
            <div className="text-xl font-black text-blue-900">¥{loseTotalSpent.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-blue-600 font-bold mb-1">平均/回</div>
            <div className="text-xl font-black text-blue-900">¥{loseAvg.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-right text-xs text-blue-700 mt-2 font-medium border-t border-blue-200 pt-2">
          {loseCount} 回撤退
        </div>
      </div>

      {/* Gallery */}
      {recentWins.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-700">最近の獲得ギャラリー</h3>
            <span className="text-xs text-gray-400">最新{recentWins.length}件</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recentWins.map((r) => (
              <div key={r.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative shadow-sm">
                <img src={r.photoUrl!} alt={r.prizeName} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-1">
                  <p className="text-[10px] text-white truncate">{r.prizeName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg mt-6">
        <h3 className="font-bold text-lg mb-1">次の景品も狙い撃ち！</h3>
        <p className="text-sm opacity-90 mb-3">
          {winRate > 50 ? '素晴らしい成績です！この調子でいきましょう。' : '焦らず狙いを定めて、確実な勝利を目指しましょう。'}
        </p>
      </div>
    </div>
  );
};

const ListView = ({ records, onDelete, onEdit, onAdd }: { records: Record[], onDelete: (id: string) => void, onEdit: (r: Record) => void, onAdd: () => void }) => {
  const [filterStore, setFilterStore] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const uniqueStores = Array.from(new Set(records.map(r => r.storeName).filter(Boolean))).sort();

  const filteredRecords = records.filter(r => {
    if (filterStore === 'all') return true;
    return r.storeName === filterStore;
  });

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const dateKey = record.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(record);
    return acc;
  }, {} as Record<string, Record[]>);

  const sortedGroupedEntries = Object.entries(groupedRecords).sort((a, b) => {
    return new Date(b[0]).getTime() - new Date(a[0]).getTime();
  });

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4 p-8 text-center">
        <Gamepad2 size={64} className="opacity-20" />
        <p>記録がまだありません。<br />「+」ボタンから最初のプレイを記録しましょう！</p>
        <button onClick={onAdd} className="bg-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow hover:bg-pink-600 transition">
          記録する
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {uniqueStores.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          <button onClick={() => setFilterStore('all')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${filterStore === 'all' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>すべて</button>
          {uniqueStores.map(store => (
            <button key={store} onClick={() => setFilterStore(store)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${filterStore === store ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{store}</button>
          ))}
        </div>
      )}

      {sortedGroupedEntries.length === 0 ? (
         <div className="text-center text-gray-400 py-8 text-sm">該当する記録がありません</div>
      ) : (
        sortedGroupedEntries.map(([date, groupRecords]) => {
          const isExpanded = expandedDates.has(date);
          const totalCost = groupRecords.reduce((sum, r) => sum + r.totalCost, 0);
          
          return (
            <div key={date} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-300">
              <div onClick={() => toggleDate(date)} className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition select-none">
                <div className="text-gray-400">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
                <div className="flex-1 flex flex-col">
                  <span className="text-sm font-bold text-gray-700">{new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{groupRecords.length} プレイ</span>
                </div>
                <span className="text-sm font-black text-gray-800 bg-white px-2 py-1 rounded-md border border-gray-100">¥{totalCost.toLocaleString()}</span>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 bg-white">
                  {groupRecords.map((record, idx) => (
                    <div key={record.id} className={`flex flex-col p-3 ${idx !== groupRecords.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative border border-gray-100">
                          {record.photoUrl ? <img src={record.photoUrl} alt={record.prizeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera size={16} /></div>}
                          <div className={`absolute bottom-0 w-full h-1 ${record.result === 'win' ? 'bg-yellow-400' : 'bg-blue-300'}`}></div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{record.prizeName || '名称未設定'}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-[10px] text-gray-500 flex items-center gap-1"><MapPin size={8} /> {record.storeName || '店名なし'}</p>
                              {/* イベントログの表示 */}
                              {record.events && record.events.length > 0 ? (
                                record.events.map((e, i) => (
                                  <p key={i} className={`text-[9px] flex items-center gap-0.5 px-1 rounded border ${e.type === 'assist' ? 'text-green-700 bg-green-50 border-green-100' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                                    {e.type === 'assist' ? <HelpingHand size={8} /> : <RefreshCcw size={8} />} 
                                    {e.move}手目
                                  </p>
                                ))
                              ) : (
                                <>
                                  {record.startType && <p className="text-[9px] text-gray-500 flex items-center gap-0.5 bg-gray-100 px-1 rounded"><PlayCircle size={8} /> {record.startType === 'initial' ? '初期' : '途中'}</p>}
                                  {record.hasAssist && <p className="text-[9px] text-green-700 flex items-center gap-0.5 bg-green-50 px-1 rounded border border-green-100"><HelpingHand size={8} /> {record.assistAt ? `${record.assistAt}手` : 'あり'}</p>}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-end mt-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${record.result === 'win' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{record.result === 'win' ? 'GET!' : '撤退'}</span>
                              <span className="text-xs font-bold text-gray-700">¥{record.totalCost.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="p-1.5 text-gray-400 hover:text-pink-500 hover:bg-white rounded-lg transition"><Edit size={14} /></button>
                              <button onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* メモ表示 */}
                      {record.memo && (
                        <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 flex gap-2 items-start">
                          <FileText size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="whitespace-pre-wrap leading-relaxed">{record.memo}</span>
                        </div>
                      )}
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
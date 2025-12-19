"use client";
import React, { useState } from "react";
import { useArticles } from "@/lib/data";
import { Search, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DbArticle } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

export default function SelfServicePage() {
  const { articles, refresh } = useArticles();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DbArticle | null>(null);
  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');

  // New Article State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [content, setContent] = useState("");

  const filtered = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    (a.tags && a.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  const handleCreate = async () => {
    const client = supabase;
    if (!client || !title || !content) return;
    
    const newArticle = {
        title,
        category,
        content,
        tags: [],
        status: 'Draft',
        // helpfulness_score removed as requested
        helpfulness_score: 0, 
        updated_at: new Date().toISOString()
    };

    if (editing) {
        await client.from('articles').update(newArticle).eq('id', editing.id);
    } else {
        await client.from('articles').insert(newArticle);
    }
    
    setTitle("");
    setContent("");
    setEditing(null);
    setEditMode('edit');
    refresh();
  };

  const handleEdit = (a: DbArticle) => {
    setEditing(a);
    setTitle(a.title);
    setCategory(a.category);
    setContent(a.content);
  };

  const handleCancel = () => {
      setEditing(null);
      setTitle("");
      setContent("");
  };

  return (
    <div className="space-y-6">
      <div className="sb-section">
        <h1 className="text-3xl font-bold text-[var(--sb-dark)]">Self-Service Portal</h1>
        <span className="text-sm text-gray-500">Manage knowledge base articles</span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Editor Pane */}
         <div className="md:col-span-2 sb-card p-6 min-h-[500px] flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Edit size={18} />
                    {editing ? "Edit Article" : "Create New Article"}
                </h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setEditMode('edit')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${editMode === 'edit' ? 'bg-white text-[var(--sb-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Editor
                    </button>
                    <button 
                        onClick={() => setEditMode('preview')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${editMode === 'preview' ? 'bg-white text-[var(--sb-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Preview
                    </button>
                </div>
             </div>

             <div className="space-y-4 flex-1 flex flex-col">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      className="sb-input text-lg font-bold" 
                      placeholder="Article Title" 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                    <select 
                      className="sb-input"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                        <option>General</option>
                        <option>Orders</option>
                        <option>Rewards</option>
                        <option>Account</option>
                    </select>
                 </div>

                 {editMode === 'edit' ? (
                     <textarea 
                       className="sb-input flex-1 min-h-[300px] font-mono text-sm leading-relaxed resize-none p-4" 
                       placeholder="Write content here (Markdown supported)...
# Use headers
**Use bold**
- Create lists"
                       value={content}
                       onChange={e => setContent(e.target.value)}
                     />
                 ) : (
                     <div className="sb-input flex-1 min-h-[300px] bg-gray-50/50 overflow-y-auto p-6 prose prose-sm max-w-none prose-headings:text-[var(--sb-dark)] prose-a:text-[var(--sb-green)] prose-strong:text-[var(--sb-dark)] prose-img:rounded-xl shadow-inner border-gray-100">
                        {content ? (
                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{content}</ReactMarkdown>
                        ) : (
                            <p className="text-gray-400 italic">No content to preview yet...</p>
                        )}
                     </div>
                 )}

                 <div className="flex gap-2 justify-end pt-4 border-t border-gray-50 mt-auto">
                     {editing && <button className="sb-btn bg-gray-400 hover:bg-gray-500 py-2" onClick={handleCancel}>Cancel</button>}
                     <button className="sb-btn py-2" onClick={handleCreate}>
                         {editing ? "Update Article" : "Publish Article"}
                     </button>
                 </div>
             </div>
         </div>

        {/* Article List Pane */}
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                  className="sb-input pl-10" 
                  placeholder="Search articles..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filtered.map(a => (
                    <div key={a.id} className="sb-card p-4 hover:border-[var(--sb-green)] transition cursor-pointer group relative" onClick={() => handleEdit(a)}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-[var(--sb-dark)] group-hover:text-[var(--sb-green)] transition-colors pr-8">
                                {a.title}
                            </h3>
                            <span className={`flex-shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${a.status === 'Published' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                {a.status}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mb-3 line-clamp-3 prose prose-sm max-w-none prose-p:my-0 prose-headings:my-1 opacity-80">
                            <ReactMarkdown remarkPlugins={[remarkBreaks]}>{a.content}</ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider pt-3 border-t border-gray-50">
                            <span>{new Date(a.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            <span className="group-hover:translate-x-1 transition-transform">Edit →</span>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No articles found.</p>}
            </div>
        </div>
      </div>
    </div>
  );
}

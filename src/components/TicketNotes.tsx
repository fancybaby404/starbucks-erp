import React, { useState } from "react";
import { Ticket } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface TicketNotesProps {
  ticket: Ticket;
  onAdd: (text: string) => void;
}

export const TicketNotes: React.FC<TicketNotesProps> = ({ ticket, onAdd }) => {
  const [text, setText] = useState("");
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input 
          className="sb-input w-full" 
          placeholder="Add internal note" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
        />
        <button 
          className="sb-btn shrink-0" 
          onClick={() => { onAdd(text); setText(""); }}
        >
          Add
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {ticket.notes.map((n) => (
          <li key={n.id} className="text-sm">
            <span className="opacity-60 mr-2">[{new Date(n.at).toLocaleString()}]</span>
            {n.text}
          </li>
        ))}
        {ticket.notes.length === 0 && (
          <li className="text-sm text-[color-mix(in_hsl,currentColor_60%,transparent)]">No notes yet.</li>
        )}
      </ul>
    </div>
  );
};

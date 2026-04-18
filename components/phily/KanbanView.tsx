"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createKanbanCard, moveKanbanCard, deleteKanbanCard } from "@/app/actions/phily";
import type { KanbanColumn, KanbanCard } from "@/lib/phily/supabase-queries";

export function KanbanView({ columns, cards }: { columns: KanbanColumn[]; cards: KanbanCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const cardsByCol = columns.reduce<Record<string, KanbanCard[]>>((acc, col) => {
    acc[col.id] = cards.filter((c) => c.column_id === col.id).sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  return (
    <div style={{ padding: "28px 32px", maxWidth: "100%", overflowX: "auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 8 }}>
          ◉ Kanban
        </div>
        <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: "-.02em", color: "var(--txt)" }}>
          Operations board
        </h1>
      </div>

      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(260px, 300px)", gap: 12, alignItems: "flex-start" }}>
        {columns.map((col) => (
          <div key={col.id} style={{ background: "var(--panel2)", borderRadius: 12, padding: 12, minHeight: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--txt2)", fontWeight: 600 }}>
                  {col.title}
                </span>
                <span style={{ fontSize: 11, color: "var(--txt3)" }}>{cardsByCol[col.id].length}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cardsByCol[col.id].map((card) => (
                <div
                  key={card.id}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--panel)",
                    boxShadow: "var(--sh)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--txt)" }}>{card.title}</div>
                    <button
                      disabled={pending}
                      onClick={() => start(async () => { await deleteKanbanCard(card.id); router.refresh(); })}
                      style={{ border: 0, background: "transparent", color: "var(--txt3)", cursor: "pointer", padding: 0 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {card.description && (
                    <div style={{ fontSize: 12, color: "var(--txt2)", lineHeight: 1.45 }}>{card.description}</div>
                  )}
                  {/* Move to other columns */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {columns.filter((c) => c.id !== col.id).map((c) => (
                      <button
                        key={c.id}
                        disabled={pending}
                        onClick={() => start(async () => {
                          const pos = (cardsByCol[c.id]?.length ?? 0) + 1;
                          await moveKanbanCard(card.id, c.id, pos);
                          router.refresh();
                        })}
                        style={{
                          fontSize: 9,
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          background: "transparent",
                          color: "var(--txt3)",
                          cursor: "pointer",
                          fontFamily: "var(--font-red-hat-mono), monospace",
                        }}
                      >
                        → {c.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {adding === col.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!title.trim()) return;
                    start(async () => {
                      await createKanbanCard(col.id, title);
                      setTitle("");
                      setAdding(null);
                      router.refresh();
                    });
                  }}
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Card title…"
                    style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--txt)", fontFamily: "var(--font-jakarta), sans-serif", fontSize: 13, outline: "none" }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="submit" disabled={pending} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, background: "var(--txt)", color: "var(--panel)", border: 0, fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace", letterSpacing: ".08em", cursor: "pointer", fontWeight: 600 }}>
                      Add
                    </button>
                    <button type="button" onClick={() => { setAdding(null); setTitle(""); }} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", color: "var(--txt3)", border: "1px solid var(--border)", fontSize: 11, cursor: "pointer" }}>
                      ×
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAdding(col.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px dashed var(--border)",
                    background: "transparent",
                    color: "var(--txt3)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontFamily: "var(--font-red-hat-mono), monospace",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  <Plus size={12} /> Add card
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatMinutes } from "@/lib/mock-data";
import type { Category, TrackingKey } from "@/lib/types";
import { GlowCard } from "@/components/GlowCard";
import { GlowingEffect } from "@/components/GlowingEffect";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ShimmerButton } from "@/components/ShimmerButton";
import {
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
  Key,
  Clock,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function CategoriesPage() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [keys, setKeys] = useState<TrackingKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      Promise.all([
        fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/keys").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([catData, keysData]) => {
          setCategories(catData || []);
          setKeys(keysData || []);
        })
        .catch(() => {
          setCategories([]);
          setKeys([]);
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  const getKeysForCategory = (categoryId: string): TrackingKey[] => {
    return keys.filter((k) => k.category_id === categoryId);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  const handleEdit = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setEditingCategory(catId);
      setCatName(cat.name);
      setCatDescription(cat.description || "");
      setShowEditModal(true);
    }
  };

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName, description: catDescription || null }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [newCat, ...prev]);
      }
    } catch {}
    setShowAddModal(false);
    setCatName("");
    setCatDescription("");
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !catName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCategory, name: catName, description: catDescription || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch {}
    setShowEditModal(false);
    setEditingCategory(null);
    setCatName("");
    setCatDescription("");
  };

  const handleDeleteCategory = async () => {
    if (!editingCategory) return;
    try {
      const res = await fetch(`/api/categories?id=${editingCategory}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== editingCategory));
      }
    } catch {}
    setShowEditModal(false);
    setEditingCategory(null);
  };

  const toggleExpand = (catId: string) => {
    setExpandedCategory(expandedCategory === catId ? null : catId);
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--app-text-muted)" }} />
      </main>
    );
  }

  if (!session) return null;

  return (
    <>
      <main style={{ minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: "672px", margin: "0 auto", width: "100%" }}>
          {/* Back + Header */}
          <div className="mb-6 animate-fade-up">
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "var(--app-text-muted)",
                textDecoration: "none",
                marginBottom: "16px",
              }}
            >
              <ArrowLeft size={16} />
              Zurück
            </Link>
            <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">
                {t("categories.title")}
              </h1>
              <p className="mt-1 text-[14px] text-[var(--app-text-muted)]">
                {t("categories.subtitle")}
              </p>
            </div>
            <ShimmerButton
              className="text-[13px] font-semibold"
              onClick={() => {
                setCatName("");
                setCatDescription("");
                setShowAddModal(true);
              }}
            >
              <Plus size={16} />
              {t("categories.add")}
            </ShimmerButton>
          </div>
          </div>

          {/* Category List */}
          {categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={t("categories.noCategories")}
              action={
                <button
                  className="btn-primary"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus size={16} />
                  {t("categories.add")}
                </button>
              }
            />
          ) : (
            <div className="space-y-4 animate-fade-up delay-1">
              {categories.map((category) => {
                const keys = getKeysForCategory(category.id);
                const totalMinutes = keys.reduce(
                  (sum, k) => sum + k.total_minutes,
                  0
                );
                const isExpanded = expandedCategory === category.id;

                return (
                  <div key={category.id}>
                    <GlowCard>
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(category.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="rounded-xl bg-[var(--app-accent-soft)] p-2.5">
                            <FolderOpen
                              size={18}
                              className="text-[var(--app-text-secondary)]"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-bold truncate">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-[12px] text-[var(--app-text-muted)] truncate mt-0.5">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="chip text-[11px]">
                            <Key size={10} />
                            {keys.length} {t("categories.keysCount")}
                          </div>
                          <div className="chip text-[11px]">
                            <Clock size={10} />
                            {formatMinutes(totalMinutes)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(category.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--app-accent-soft)] transition-all"
                          >
                            <Pencil
                              size={13}
                              className="text-[var(--app-text-muted)]"
                            />
                          </button>
                          <ChevronRight
                            size={16}
                            className={`text-[var(--app-text-muted)] transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded Keys */}
                      {isExpanded && keys.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--app-border)]">
                          {keys.map((key, i) => (
                            <div
                              key={key.id}
                              className={`flex items-center justify-between py-2.5 ${
                                i < keys.length - 1
                                  ? "border-b border-[var(--app-border)]"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: key.color }}
                                />
                                <span className="text-[13px] font-medium">
                                  {key.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-[var(--app-text-muted)] tabular-nums">
                                  {formatMinutes(key.total_minutes)}
                                </span>
                                <span className="text-[11px] text-[var(--app-text-muted)]">
                                  · {key.event_count} Events
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && keys.length === 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--app-border)]">
                          <p className="text-[13px] text-[var(--app-text-muted)] text-center py-4">
                            {t("keys.noKeys")}
                          </p>
                        </div>
                      )}
                    </GlowCard>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Category Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t("categories.add")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5">
              {t("categories.name")}
            </label>
            <input
              type="text"
              className="input"
              placeholder={t("categories.namePlaceholder")}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5">
              {t("categories.description")}
            </label>
            <input
              type="text"
              className="input"
              placeholder={t("categories.descriptionPlaceholder")}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              className="btn-ghost"
              onClick={() => setShowAddModal(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                handleAddCategory();
              }}
            >
              {t("common.create")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t("categories.edit")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5">
              {t("categories.name")}
            </label>
            <input
              type="text"
              className="input"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--app-text-muted)] mb-1.5">
              {t("categories.description")}
            </label>
            <input
              type="text"
              className="input"
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-between pt-2">
            <button className="btn-danger" onClick={handleDeleteCategory}>
              <Trash2 size={14} />
              {t("common.delete")}
            </button>
            <div className="flex gap-3">
              <button
                className="btn-ghost"
                onClick={() => setShowEditModal(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  handleUpdateCategory();
                }}
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

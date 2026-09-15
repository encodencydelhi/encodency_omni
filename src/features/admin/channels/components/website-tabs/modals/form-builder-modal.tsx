"use client";

import { useState } from "react";
import { X, Plus, Trash2, FileText, Check, Copy, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import { WebsiteFormItem } from "../types";

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: WebsiteFormItem) => void;
}

export function FormBuilderModal({ isOpen, onClose, onSave }: FormBuilderModalProps) {
  const [formName, setFormName] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("/thank-you");
  const [emailNotify, setEmailNotify] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("admin@namogangetrust.org");
  const [enableCaptcha, setEnableCaptcha] = useState(true);
  const [activeTab, setActiveTab] = useState<"fields" | "settings" | "embed">("fields");

  const [fields, setFields] = useState<
    { id: string; name: string; type: string; required: boolean }[]
  >([
    { id: "1", name: "Full Name", type: "text", required: true },
    { id: "2", name: "Email Address", type: "email", required: true },
    { id: "3", name: "Phone Number", type: "tel", required: false },
    { id: "4", name: "Message / Query", type: "textarea", required: true },
  ]);

  if (!isOpen) return null;

  const handleAddField = () => {
    const newId = (fields.length + 1).toString();
    setFields([...fields, { id: newId, name: `Custom Field ${fields.length + 1}`, type: "text", required: false }]);
  };

  const handleRemoveField = (id: string) => {
    if (fields.length <= 1) {
      toast.error("A form must have at least one field");
      return;
    }
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a form name");
      return;
    }
    const newForm: WebsiteFormItem = {
      id: "form-" + Date.now(),
      name: formName.trim(),
      status: "Active",
      submissions: 0,
      conv: "0.0%",
      fields: fields.map((f) => ({ name: f.name, type: f.type, required: f.required })),
      redirectUrl,
      emailNotifications: emailNotify,
    };
    onSave(newForm);
    toast.success(`Form "${newForm.name}" created successfully!`);
    onClose();
  };

  const embedSnippet = `<iframe src="https://namogangetrust.org/forms/${formName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "custom-form"}" width="100%" height="450" frameborder="0"></iframe>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col h-[85vh] w-full max-w-2xl rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-sm bg-blue-600 text-white font-bold text-xs">
              <FileText className="size-3.5" />
            </span>
            <h3 className="text-xs font-bold text-slate-900">Visual Form Builder</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-7 place-items-center rounded-sm text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-200 px-4 bg-white gap-4">
          {(["fields", "settings", "embed"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-xs font-bold capitalize border-b-2 transition-colors cursor-pointer ${
                activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "fields" ? "Form Fields" : tab === "settings" ? "Redirects & Notifications" : "Embed Code"}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {activeTab === "fields" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Form Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Volunteer Drive Registration Form"
                  className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">Custom Form Fields ({fields.length})</span>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Plus className="size-3" /> Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 p-2.5 rounded-sm border border-slate-200 bg-slate-50/70"
                    >
                      <span className="text-[10.5px] font-bold text-slate-400 w-4">{i + 1}.</span>
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => {
                          const updated = [...fields];
                          const field = updated[i];
                          if (field) field.name = e.target.value;
                          setFields(updated);
                        }}
                        className="h-7 flex-1 rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-800"
                      />
                      <select
                        value={f.type}
                        onChange={(e) => {
                          const updated = [...fields];
                          const field = updated[i];
                          if (field) field.type = e.target.value;
                          setFields(updated);
                        }}
                        className="h-7 rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-700"
                      >
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="textarea">Textarea</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => {
                            const updated = [...fields];
                            const field = updated[i];
                            if (field) field.required = e.target.checked;
                            setFields(updated);
                          }}
                          className="rounded-xs text-blue-600 focus:ring-0"
                        />
                        <span>Req</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(f.id)}
                        className="p-1 rounded-sm text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Thank You / Redirect URL
                </label>
                <input
                  type="text"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="/thank-you"
                  className="h-8 w-full rounded-sm border border-slate-200 px-2.5 text-xs text-slate-800 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">Users will be directed here immediately upon form submission.</p>
              </div>

              <div className="p-3 rounded-sm border border-slate-200 bg-slate-50 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">Email Inbound Submissions</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotify}
                    onChange={(e) => setEmailNotify(e.target.checked)}
                    className="rounded-xs text-blue-600"
                  />
                </label>
                {emailNotify && (
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="h-7 w-full rounded-sm border border-slate-200 bg-white px-2 text-xs"
                    placeholder="Recipient email address"
                  />
                )}
              </div>

              <div className="p-3 rounded-sm border border-slate-200 bg-slate-50">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Anti-Spam Cloudflare Turnstile</span>
                      <span className="text-[10px] text-slate-400">Silent human verification without intrusive image captchas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableCaptcha}
                    onChange={(e) => setEnableCaptcha(e.target.checked)}
                    className="rounded-xs text-blue-600"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === "embed" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Copy and paste this snippet onto any external landing page or partner portal to embed this form:
              </p>
              <div className="p-3 rounded-sm bg-slate-900 text-slate-200 font-mono text-[11px] relative">
                <code>{embedSnippet}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(embedSnippet);
                    toast.success("Embed code copied to clipboard!");
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1 rounded-sm bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[10px] text-white transition-colors cursor-pointer"
                >
                  <Copy className="size-3" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex h-8 items-center gap-1.5 rounded-sm bg-blue-600 hover:bg-blue-700 px-4 text-xs font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Check className="size-3.5" />
            <span>Save & Publish Form</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

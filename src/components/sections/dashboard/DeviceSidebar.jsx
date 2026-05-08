import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEVICE_TYPES = [
  'Cảm biến môi trường',
  'Cảm biến không khí'
];

// ─── Registration Modal ────────────────────────────────────────────────
const LegacyRegisterModal = ({ onClose, onConfirm }) => {
  const [form, setForm] = useState({ id: '', type: DEVICE_TYPES[0], location: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSubmit = () => {
    if (!form.id.trim() || !form.location.trim()) {
      setError('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    onConfirm({ ...form, id: form.id.trim(), location: form.location.trim(), status: 'online' });
  };

  return createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal card */}
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">Đăng ký thiết bị mới</h2>
              <p className="text-xs text-muted-foreground">Điền thông tin bên dưới để thêm thiết bị</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Device ID */}
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1.5 block">
              ID Thiết Bị
            </label>
            <input
              id="modal-input-device-id"
              type="text"
              placeholder="VD: kankyou"
              value={form.id}
              onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-background/80 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Device Type */}
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1.5 block">
              Loại Thiết Bị
            </label>
            <select
              id="modal-select-device-type"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-background/80 border border-border/60 text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
            >
              {DEVICE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1.5 block">
              Vị Trí
            </label>
            <input
              id="modal-input-device-location"
              type="text"
              placeholder="VD: Phòng lab"
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-background/80 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            id="modal-btn-cancel"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-muted/40 text-foreground/70 text-sm font-semibold hover:bg-muted/70 transition-all border border-border/50"
          >
            Hủy
          </button>
          <button
            id="modal-btn-confirm"
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-primary/20"
          >
            ✓ Xác nhận đăng ký
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Sidebar ────────────────────────────────────────────────────────────
export const LegacyDeviceSidebar = ({ className = "" }) => {
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = (newDevice) => {
    if (devices.find(d => d.id === newDevice.id)) {
      // duplicate id handled inside modal, but double guard
      return;
    }
    setDevices(prev => [...prev, newDevice]);
    setShowModal(false);
  };

  return (
    <>
      <div
        className={cn(
          "w-64 shrink-0 flex flex-col border-r border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-foreground">Danh Sách Thiết Bị</h2>
          </div>
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">{devices.length} thiết bị đã đăng ký</p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {devices.map((device) => (
            <div
              key={device.id}
              className="mx-auto w-full p-3 rounded-xl border border-border/50 bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
            >
              <div className="mb-1 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <p className="shrink-0 text-xs font-bold text-foreground">{device.id}</p>
                  <p className="min-w-0 truncate text-[10px] text-muted-foreground leading-snug">
                    {device.type}
                  </p>
                </div>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    device.status === 'online'
                      ? 'bg-green-400 shadow-[0_0_6px_#4ade80]'
                      : 'bg-muted-foreground'
                  }`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {device.location}
              </p>
            </div>
          ))}
        </div>

        {/* Register button */}
        <div className="px-3 py-4 border-t border-border/50 shrink-0">
          <button
            id="btn-register-device"
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-primary/20"
          >
            <span className="text-base font-bold">＋</span>
            Đăng ký thiết bị
          </button>
        </div>
      </div>

      {/* Portal-style modal */}
      {showModal && (
        <LegacyRegisterModal
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
};

const MODERN_DEVICE_TYPES = [
  "Cảm biến môi trường",
  "Cảm biến không khí",
];

const RegisterDeviceModal = ({ devices, onClose, onConfirm }) => {
  const [form, setForm] = useState({
    id: "",
    type: MODERN_DEVICE_TYPES[0],
    location: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSubmit = () => {
    const normalizedId = form.id.trim();
    const normalizedLocation = form.location.trim();

    if (!normalizedId || !normalizedLocation) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (devices.some((device) => device.id.toLowerCase() === normalizedId.toLowerCase())) {
      setError("ID thiết bị đã tồn tại.");
      return;
    }

    onConfirm({
      id: normalizedId,
      type: form.type,
      location: normalizedLocation,
      status: "online",
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Đăng ký thiết bị mới</h2>
            <p className="text-xs text-muted-foreground">
              Điền thông tin bên dưới để thêm thiết bị.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ID thiết bị
            </label>
            <input
              id="modal-input-device-id"
              type="text"
              placeholder="VD: kankyou"
              value={form.id}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, id: event.target.value }))
              }
              className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Loại thiết bị
            </label>
            <select
              id="modal-select-device-type"
              value={form.type}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, type: event.target.value }))
              }
              className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-foreground transition-all focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            >
              {MODERN_DEVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vị trí
            </label>
            <input
              id="modal-input-device-location"
              type="text"
              placeholder="VD: Phòng lab"
              value={form.location}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, location: event.target.value }))
              }
              className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            id="modal-btn-cancel"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border/50 bg-muted/40 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:bg-muted/70"
          >
            Hủy
          </button>
          <button
            id="modal-btn-confirm"
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0"
          >
            Xác nhận đăng ký
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const DeviceSidebar = ({
  className = "",
  devices = [],
  selectedDeviceId = "",
  onSelectDevice,
  onRegisterDevice,
  onUnregisterDevice,
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = (newDevice) => {
    onRegisterDevice?.(newDevice);
    setShowModal(false);
  };

  const handleRemoveDevice = (device) => {
    const shouldRemove = window.confirm(`Hủy đăng ký thiết bị "${device.id}"?`);
    if (!shouldRemove) {
      return;
    }

    onUnregisterDevice?.(device.id);
  };

  return (
    <>
      <div
        className={cn(
          "w-64 shrink-0 flex flex-col border-r border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden",
          className
        )}
      >
        <div className="px-4 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-foreground">Danh Sách Thiết Bị</h2>
          </div>
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              {devices.length ? `${devices.length} thiết bị đã đăng ký` : "Chưa đăng ký thiết bị nào"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {devices.length ? (
            devices.map((device) => {
              const isActive = device.id === selectedDeviceId;

              return (
                <div
                  key={device.id}
                  className={cn(
                    "mx-auto w-full rounded-xl border p-3 transition-all duration-200",
                    isActive
                      ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border/50 bg-background/60 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectDevice?.(device.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <p className="shrink-0 text-xs font-bold text-foreground">{device.id}</p>
                          <p className="min-w-0 truncate text-[10px] text-muted-foreground leading-snug">
                            {device.type}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            device.status === "online"
                              ? "bg-green-400 shadow-[0_0_6px_#4ade80]"
                              : "bg-muted-foreground"
                          )}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {device.location}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(device)}
                      className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-500 transition-colors hover:bg-red-500/20"
                      aria-label={`Hủy đăng ký thiết bị ${device.id}`}
                      title="Hủy đăng ký thiết bị"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-background/40 px-3 py-4 text-center">
              <p className="text-xs font-medium text-foreground">Chưa đăng ký thiết bị nào</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Nhấn nút bên dưới để thêm thiết bị và bắt đầu theo dõi dữ liệu.
              </p>
            </div>
          )}
        </div>

        <div className="px-3 py-4 border-t border-border/50 shrink-0">
          <button
            id="btn-register-device"
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-primary/20"
          >
            <span className="text-base font-bold">＋</span>
            Đăng ký thiết bị
          </button>
        </div>
      </div>

      {showModal ? (
        <RegisterDeviceModal
          devices={devices}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
};

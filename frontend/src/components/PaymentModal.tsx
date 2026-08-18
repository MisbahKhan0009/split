import { useState } from "react";
import { Check, X } from "lucide-react";
import { money } from "../data/demoData";

const PAYMENT_METHODS = [
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "card", label: "Card" },
  { id: "bank_transfer", label: "Bank Transfer" },
];

type PaymentModalProps = {
  settlementId: number;
  amount: number;
  toName: string;
  onPay: (settlementId: number, paymentMethod: string) => Promise<void>;
  onClose: () => void;
};

export function PaymentModal({
  settlementId,
  amount,
  toName,
  onPay,
  onClose,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState("bkash");
  const [state, setState] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [reference, setReference] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleConfirm = () => {
    setState("processing");
    setTimeout(async () => {
      try {
        await onPay(settlementId, selectedMethod);
        setReference(`SIM-${Date.now().toString(36).toUpperCase()}`);
        setState("success");
        setTimeout(onClose, 2000);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Payment failed.");
        setState("error");
      }
    }, 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="payment-modal glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="payment-modal-header">
          <h2>
            Pay {money(amount)} to {toName}
          </h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {state === "idle" && (
          <>
            <p className="muted-label">SELECT PAYMENT METHOD</p>
            <div className="payment-method-grid">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`payment-method-option ${selectedMethod === method.id ? "selected" : ""}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  {method.label}
                </button>
              ))}
            </div>
            <div className="payment-modal-actions">
              <button className="secondary-button" onClick={onClose}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleConfirm}>
                Confirm payment
              </button>
            </div>
          </>
        )}

        {state === "processing" && (
          <div className="payment-processing">
            <div className="payment-spinner" />
            <p>
              Processing payment via{" "}
              {PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.label}…
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="payment-success">
            <div className="payment-success-icon">
              <Check size={28} />
            </div>
            <h3>Payment confirmed</h3>
            <p className="muted-label">{reference}</p>
          </div>
        )}

        {state === "error" && (
          <div className="payment-processing">
            <p className="error-text">{errorMessage}</p>
            <button
              className="secondary-button"
              onClick={() => setState("idle")}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

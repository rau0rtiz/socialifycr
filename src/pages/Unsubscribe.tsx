import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2, MailMinus } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FN_URL = `${SUPABASE_URL}/functions/v1/handle-unsubscribe`;

const REASONS = [
  { value: "no_interesa", label: "No me interesa este contenido" },
  { value: "muchos_correos", label: "Recibo muchos correos" },
  { value: "no_solicite", label: "No solicité estos correos" },
  { value: "otro", label: "Otro" },
];

type ViewState = "form" | "success" | "already" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [view, setView] = useState<ViewState>("form");
  const [email, setEmail] = useState(emailParam?.toLowerCase() || "");
  const [reason, setReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Best-effort: ask backend for canonical email if we only have token
  useEffect(() => {
    if (emailParam || !token) return;
    (async () => {
      try {
        const res = await fetch(
          `${FN_URL}?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        const result = await res.json();
        if (res.ok && result.valid && result.email) {
          setEmail(result.email);
          if (result.already_used) setView("already");
        }
      } catch (e) {
        console.error("validate error:", e);
      }
    })();
  }, [token, emailParam]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMsg("Ingresá un correo válido.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const finalReason =
        reason === "otro"
          ? otherText || "Otro"
          : REASONS.find((r) => r.value === reason)?.label || "";

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, email, reason: finalReason }),
      });

      const result = await res.json();

      if (result.already_unsubscribed) {
        setView("already");
      } else if (result.success) {
        setView("success");
      } else {
        setErrorMsg(result.error || "Error al procesar la solicitud.");
        setView("error");
      }
    } catch (e) {
      console.error("submit error:", e);
      setErrorMsg("Error de conexión. Intentá de nuevo.");
      setView("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h2 className="font-wordmark text-3xl uppercase text-[#212121]">SOCIALIFY</h2>
        </div>

        {view === "form" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <MailMinus className="h-12 w-12 text-muted-foreground" />
              <h1 className="text-xl font-semibold text-gray-800 text-center">¿Deseas desuscribirte?</h1>
              <p className="text-sm text-gray-500 text-center">
                Confirmá el correo que querés desuscribir.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">¿Podrías contarnos por qué? (opcional)</p>
              <RadioGroup value={reason} onValueChange={setReason}>
                {REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-3 py-1">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="text-sm text-gray-600 cursor-pointer">
                      {r.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {reason === "otro" && (
                <Textarea
                  placeholder="Cuéntanos más..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              )}
            </div>

            {errorMsg && (
              <p className="text-sm text-red-500 text-center">{errorMsg}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !email.trim()}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                "Confirmar desuscripción"
              )}
            </Button>
          </div>
        )}

        {view === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h1 className="text-xl font-semibold text-gray-800">¡Listo!</h1>
            <p className="text-sm text-gray-500 text-center">
              Te hemos desuscrito exitosamente. <strong>{email}</strong> no recibirá más correos de nuestra parte.
            </p>
          </div>
        )}

        {view === "already" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-16 w-16 text-blue-500" />
            <h1 className="text-xl font-semibold text-gray-800">Ya estás desuscrito</h1>
            <p className="text-sm text-gray-500 text-center">
              <strong>{email}</strong> ya no recibirá correos de nuestra parte.
            </p>
          </div>
        )}

        {view === "error" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-16 w-16 text-red-400" />
            <h1 className="text-xl font-semibold text-gray-800">Error</h1>
            <p className="text-sm text-gray-500 text-center">{errorMsg}</p>
            <Button variant="outline" onClick={() => { setView("form"); setErrorMsg(""); }}>
              Volver
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">
          Socialify · socialifycr.com
        </p>
      </div>
    </div>
  );
};

export default Unsubscribe;

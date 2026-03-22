import { useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Verify2FASetupResponse } from "@/types/auth";

interface SetupResponse {
  qr_code_url: string;
  secret: string;
}

export default function Setup2FA() {
  const { t } = useTranslation();

  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState<"initial" | "scan" | "done">("initial");

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post<SetupResponse>("/auth/2fa/setup");
      setQrUrl(data.qr_code_url);
      setSecret(data.secret);
      setStep("scan");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setVerifying(true);
    try {
      const { data } = await api.post<Verify2FASetupResponse>("/auth/2fa/verify-setup", { code });
      setRecoveryCodes(data.recovery_codes ?? []);
      setStep("done");
      toast.success(t("setup2FA.enabled"));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      toast.success(t("setup2FA.copied"));
    } catch {
      toast.error(t("setup2FA.copyFailed"));
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t("setup2FA.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("setup2FA.description")}
          </p>
        </div>

        {step === "initial" && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3
              text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <LoadingSpinner className="h-5 w-5 border-white" /> : t("setup2FA.generate")}
          </button>
        )}

        {step === "scan" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <QRCodeSVG value={qrUrl} size={200} />
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {t("setup2FA.backupSecret")}
                </p>
                <code className="block w-full break-all rounded bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {secret}
                </code>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("setup2FA.enterCode")}
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg
                    font-mono tracking-widest focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500
                    focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3
                  text-sm font-semibold text-white shadow-sm hover:bg-indigo-500
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifying ? <LoadingSpinner className="h-5 w-5 border-white" /> : t("setup2FA.verify")}
              </button>
            </form>
          </div>
        )}

        {step === "done" && recoveryCodes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t("setup2FA.saveRecoveryCodes")}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((rc) => (
                  <code
                    key={rc}
                    className="rounded bg-white px-3 py-1.5 text-center text-sm font-mono text-gray-800
                      dark:bg-gray-700 dark:text-gray-200"
                  >
                    {rc}
                  </code>
                ))}
              </div>
            </div>

            <button
              onClick={copyRecoveryCodes}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300
                bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
                transition-colors"
            >
              {t("setup2FA.copyAll")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

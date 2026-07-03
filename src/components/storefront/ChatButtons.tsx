import { getConversionConfig } from "@/server/settings/conversion";

// Floating WhatsApp + Messenger buttons, bottom-right. Numbers/links are
// configured in Admin → Settings → Appearance; each button only renders when
// its value is set. Server component — no client JS, just links.
export default async function ChatButtons() {
  const config = await getConversionConfig();
  const whatsapp = config.whatsappNumber;
  const messenger = config.messengerUrl;
  if (!whatsapp && !messenger) return null;

  return (
    <div className="chat-fab" aria-label="Chat with us">
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on WhatsApp"
          className="chat-fab-btn"
          style={{ background: "#25D366" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1s-.5-.2-.7.1c-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" />
          </svg>
        </a>
      )}
      {messenger && (
        <a
          href={messenger}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat on Messenger"
          className="chat-fab-btn"
          style={{ background: "#0084FF" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M12 2C6.3 2 2 6.2 2 11.6c0 2.9 1.3 5.4 3.4 7.1v3.5l3.1-1.7c.8.2 1.7.4 2.5.4 5.7 0 10-4.2 10-9.6C21 6.2 17.7 2 12 2zm1 12.9l-2.6-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.3 5.7z" />
          </svg>
        </a>
      )}
    </div>
  );
}

import Image from 'next/image';
import Link from 'next/link';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand-logo ${compact ? 'brand-logo--compact' : ''}`} aria-label="CyberVestigio - inicio">
      <Image
        src="/brand/cybervestigio-logo-cropped.png"
        alt="CyberVestigio"
        width={compact ? 176 : 232}
        height={compact ? 72 : 92}
        className="brand-logo__image"
        priority
      />
    </Link>
  );
}

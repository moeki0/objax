import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Objax",
  description: "How Objax collects, uses, and protects your data.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-6 text-gray-700">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-gray-500">Objax</p>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-gray-600">
          This Privacy Policy explains how Objax (&quot;we&quot;,
          &quot;our&quot;, or &quot;us&quot;) collects, uses, shares, and
          protects information about you when you use our products, services,
          and websites (collectively, the &quot;Services&quot;).
        </p>
      </header>

      <Section title="1. Information We Collect">
        <ul className="list-disc list-inside space-y-1">
          <li>
            Account information, such as your name, email address, and identity
            provider data when you sign in.
          </li>
          <li>
            Usage data, including interactions with features, logs, and device
            identifiers necessary to operate and secure the Services.
          </li>
          <li>
            Device and connection information, including browser type, language,
            IP address, and approximate location derived from IP address.
          </li>
        </ul>
      </Section>

      <Section title="2. How We Use Information">
        <ul className="list-disc list-inside space-y-1">
          <li>To provide, maintain, and improve the Services.</li>
          <li>
            To authenticate you, secure accounts, and prevent fraud or abuse.
          </li>
          <li>
            To conduct analytics that help us understand performance and
            reliability.
          </li>
          <li>To comply with legal obligations and enforce our policies.</li>
        </ul>
      </Section>

      <Section title="3. How We Share Information">
        <ul className="list-disc list-inside space-y-1">
          <li>
            With service providers who process data on our behalf under
            appropriate confidentiality and security obligations.
          </li>
          <li>
            When required by law, legal process, or to protect rights, property,
            or safety of Objax, our users, or others.
          </li>
          <li>
            In connection with a merger, acquisition, or sale of assets, subject
            to continued protection of your information.
          </li>
        </ul>
      </Section>

      <Section title="4. Data Retention and Security">
        <p>
          We retain information for as long as necessary to provide the Services
          and for legitimate business needs, such as complying with legal
          obligations. We use administrative, technical, and physical safeguards
          designed to protect information against unauthorized access or
          disclosure, but no system can be guaranteed to be completely secure.
        </p>
      </Section>

      <Section title="5. Your Choices">
        <p>
          You may update or correct certain account information through your
          account settings. You can contact us to request access to or deletion
          of your information, subject to legal obligations and legitimate
          business needs.
        </p>
      </Section>

      <Section title="6. International Transfers">
        <p>
          We may process and store information in countries other than where you
          reside. We take steps to ensure that transfers comply with applicable
          data protection laws and that your information remains protected.
        </p>
      </Section>

      <Section title="7. Children">
        <p>
          The Services are not directed to children under the age of 13 (or the
          age required by applicable law). We do not knowingly collect personal
          information from children. If you believe a child has provided us with
          personal information, contact us so we can take appropriate action.
        </p>
      </Section>

      <Section title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. If changes are
          material, we will provide notice as required by law. Your continued
          use of the Services after the effective date of an updated policy
          constitutes acceptance of the changes.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          If you have questions about this Privacy Policy, contact us at
          hi@moeki.org .
        </p>
      </Section>
    </main>
  );
}

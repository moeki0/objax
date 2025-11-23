import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Objax",
  description: "Terms of Service governing use of the Objax platform.",
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
      <div className="space-y-2 text-sm leading-6 text-gray-700">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-gray-500">Objax</p>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm text-gray-600">
          These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of the Objax products, services, and websites (collectively, the
          &quot;Services&quot;). By accessing or using the Services, you agree to
          be bound by these Terms.
        </p>
      </header>

      <Section title="1. Eligibility and Accounts">
        <p>
          You must be at least 18 years old and legally able to enter into these
          Terms. You are responsible for maintaining the confidentiality of your
          account credentials and for all activity under your account. Notify us
          immediately of any unauthorized use.
        </p>
      </Section>

      <Section title="2. Acceptable Use">
        <ul className="list-disc list-inside space-y-1">
          <li>Do not violate any applicable law or regulation.</li>
          <li>
            Do not use the Services to harm, disrupt, or interfere with others
            or with the security or operation of the Services.
          </li>
          <li>
            Do not attempt to access data or systems without authorization or
            reverse engineer the Services except as permitted by law.
          </li>
          <li>
            Do not upload content that is illegal, infringing, or violates the
            rights of others.
          </li>
        </ul>
      </Section>

      <Section title="3. Prohibited Conduct">
        <p>
          The following activities are strictly prohibited. These examples do not
          limit any other restrictions described in these Terms or applicable
          policies.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Using bots, scripts, macros, crawlers, or other automated means to
            interact with the Services or place pixels/actions in unauthorized
            ways.
          </li>
          <li>
            Bypassing or attempting to bypass cooldowns, rate limits, fraud
            prevention, security checks, or other technical restrictions.
          </li>
          <li>
            Scraping, bulk capturing, scanning, or automatically extracting
            images, data, canvas elements, or Service content for commercial
            purposes, redistribution, competing services, or third-party model
            training.
          </li>
          <li>
            Tampering with or attempting to circumvent technical protections,
            authentication, access controls, canvas integrity, or Service
            infrastructure.
          </li>
          <li>
            Automatically copying or reproducing substantial parts of the canvas
            in real time to replicate, map, reverse engineer, or build a
            competing product or platform.
          </li>
          <li>
            Creating or using multiple accounts to manipulate outcomes, gain
            unfair advantage, evade penalties or blocks, or otherwise interfere
            with platform operations.
          </li>
          <li>
            Using data or content generated within the Services to train AI
            models, products, or competing services without our explicit
            permission.
          </li>
          <li>
            Interfering with other users’ normal use of the Services, overloading
            servers, or degrading performance, stability, or security.
          </li>
          <li>
            Deception, harassment, defamation, hate speech, or any content that
            is illegal, abusive, or otherwise violates the Code of Conduct.
          </li>
        </ul>
      </Section>

      <Section title="4. Your Content">
        <p>
          You retain ownership of content you submit to the Services. You grant
          us a worldwide, non-exclusive license to use, reproduce, modify, and
          display your content solely to operate, improve, and provide the
          Services. You represent and warrant that you have all rights necessary
          to grant this license and that your content does not violate these
          Terms.
        </p>
      </Section>

      <Section title="5. Intellectual Property">
        <p>
          We and our licensors retain all rights, title, and interest in and to
          the Services, including all related intellectual property. These Terms
          do not grant you any rights to use our trademarks, logos, or other
          brand elements without our prior written permission.
        </p>
      </Section>

      <Section title="6. Paid Features">
        <p>
          If you purchase any paid features, you agree to the pricing,
          subscription terms, and billing policies presented at checkout. Except
          where required by law, payments are non-refundable.
        </p>
      </Section>

      <Section title="7. Disclaimers">
        <p>
          The Services are provided &quot;as is&quot; and &quot;as available&quot;
          without warranties of any kind, whether express, implied, or statutory,
          including merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the Services will be
          uninterrupted, secure, or error-free.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, neither we nor our suppliers
          will be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of profits, revenues, data, or use,
          arising out of or related to your use of the Services. Our aggregate
          liability for all claims relating to the Services is limited to the
          greater of USD $100 or the amounts you paid us in the 6 months before
          the event giving rise to the claim.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          We may suspend or terminate your access to the Services at any time for
          any reason, including violation of these Terms. You may stop using the
          Services at any time. Sections that by their nature should survive
          termination will remain in effect.
        </p>
      </Section>

      <Section title="10. Changes to the Services or Terms">
        <p>
          We may modify the Services or these Terms at any time. If changes are
          material, we will provide notice as required by law. Your continued use
          of the Services after changes become effective constitutes acceptance
          of the updated Terms.
        </p>
      </Section>

      <Section title="11. Governing Law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which Objax
          is organized, without regard to conflict of laws principles. Any
          disputes will be resolved in the courts located in that jurisdiction,
          unless applicable law requires otherwise.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          If you have questions about these Terms, contact us at
          support@objax.example.
        </p>
      </Section>
    </main>
  );
}

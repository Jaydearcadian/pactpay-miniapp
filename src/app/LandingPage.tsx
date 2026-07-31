export function LandingPage() {
  return <main className="landingPage">
    <nav className="siteNav">
      <button className="brand" onClick={() => { window.location.hash = '/'; }}>
        <span>P</span><div><strong>PactPay</strong><small>Private outcome settlement</small></div>
      </button>
      <div className="navLinks">
        <a href="#how-it-works">How it works</a>
        <a href="#privacy">Privacy</a>
        <a href="#settlement">Settlement</a>
        <button onClick={() => { window.location.hash = '/demo'; }}>Demo</button>
      </div>
      <div className="navActions">
        <button className="secondary" onClick={() => { window.location.hash = '/wallet'; }}>Connect wallet</button>
        <button className="primary" onClick={() => { window.location.hash = '/app'; }}>Open app</button>
      </div>
    </nav>

    <section className="cinematicHero">
      <div className="corridor" aria-hidden="true">
        <span className="corridorLine lineOne" />
        <span className="corridorLine lineTwo" />
        <span className="corridorLine lineThree" />
        <div className="floatingSheet sheetOne"><small>DESIGNER</small><strong>120 NIM</strong></div>
        <div className="floatingSheet sheetTwo"><small>COPYWRITER</small><strong>80 NIM</strong></div>
        <div className="floatingSheet sheetThree"><small>EDITOR</small><strong>160 NIM</strong></div>
      </div>
      <div className="heroContent">
        <p className="eyebrow">PRIVATE CONTRIBUTION COORDINATION</p>
        <h1>One outcome.<br />Private contributions.<br />Everyone settled.</h1>
        <p>PactPay gives every contributor a clear private agreement, a defined entitlement, and verifiable NIM settlement—without exposing the rest of the deal.</p>
        <div className="actions">
          <button className="primary" onClick={() => { window.location.hash = '/app'; }}>Create an outcome</button>
          <button className="secondary" onClick={() => { window.location.hash = '/demo'; }}>Watch the guided demo</button>
        </div>
        <div className="trustLine"><span>No accounts required</span><span>Private handoff links</span><span>Nimiq Pay settlement</span></div>
      </div>
    </section>

    <section className="storySection" id="how-it-works">
      <div className="sectionIntro"><p className="eyebrow">THE COORDINATION PROBLEM</p><h2>One result often depends on people who should not share the same commercial room.</h2></div>
      <div className="storyGrid">
        <article><span>01</span><h3>Define</h3><p>Set the role, obligation, acceptance criteria, deadlines, and NIM entitlement.</p></article>
        <article><span>02</span><h3>Share</h3><p>Generate one private contribution room containing only what that contributor needs.</p></article>
        <article><span>03</span><h3>Settle</h3><p>Review evidence, approve the exact amount, and settle through Nimiq Pay.</p></article>
      </div>
    </section>

    <section className="splitSection" id="privacy">
      <div><p className="eyebrow">ROLE-SCOPED PRIVACY</p><h2>Everyone sees what they need. Nothing more.</h2><p>The coordinator keeps the complete outcome view. Each contributor receives only their obligation, criteria, deadline, entitlement, and settlement proof.</p></div>
      <div className="privacyComparison">
        <article><small>COORDINATOR SEES</small><strong>The complete outcome</strong><p>All contributions, deadlines, evidence, commitments, and settlement progress.</p></article>
        <article><small>CONTRIBUTOR SEES</small><strong>Their private deal</strong><p>Their obligation, acceptance criteria, entitlement, deadlines, and receipt.</p></article>
      </div>
    </section>

    <section className="dealScene">
      <article className="dealSheet">
        <p className="eyebrow">PRIVATE CONTRIBUTION</p><h3>Launch designer</h3><p>Deliver the final responsive launch-page design and editable source files.</p>
        <div className="dealCriteria"><span>Desktop approved</span><span>Mobile approved</span><span>Source included</span></div>
        <div className="dealEntitlement"><small>YOUR ENTITLEMENT</small><strong>120 NIM</strong></div>
        <div className="dealSeal">TERMS FROZEN</div>
      </article>
      <div className="dealCopy"><p className="eyebrow">CLARITY BEFORE WORK</p><h2>The deal is clear before the work begins.</h2><p>Once issued, the obligation, criteria, entitlement, and deadlines are fingerprinted. Contributors can understand the agreement before connecting a wallet or accepting the work.</p></div>
    </section>

    <section className="settlementSection" id="settlement">
      <div className="sectionIntro"><p className="eyebrow">VERIFIABLE SETTLEMENT</p><h2>Approval becomes proof.</h2><p>PactPay binds submitted evidence to frozen terms, then opens Nimiq Pay for explicit payment approval.</p></div>
      <div className="settlementFlow"><span>Review evidence</span><span>Confirm recipient</span><span>Approve in Nimiq Pay</span><span>Receive transaction hash</span></div>
      <article className="receiptPreview"><div className="settledSeal">✓</div><small>SETTLED</small><strong>120 NIM sent</strong><p>Recipient · NQ12…83KD</p><p>Transaction · 9ab21dc4…</p></article>
    </section>

    <section className="finalCta">
      <p className="eyebrow">PACTPAY</p><h2>Build the outcome without exposing the whole deal.</h2>
      <div className="actions"><button className="primary" onClick={() => { window.location.hash = '/demo'; }}>Open guided demo</button><button className="secondary" onClick={() => { window.location.hash = '/app'; }}>Create your first outcome</button></div>
    </section>

    <footer className="siteFooter">
      <div><strong>PactPay</strong><p>Clear terms. Private fulfilment. Verifiable NIM settlement.</p></div>
      <div className="footerLinks"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><a href="#settlement">Settlement</a><button onClick={() => { window.location.hash = '/demo'; }}>Demo</button><button onClick={() => { window.location.hash = '/app'; }}>Open app</button></div>
    </footer>
  </main>;
}

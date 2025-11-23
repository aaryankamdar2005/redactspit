export default function Helpline() {
  const supportNumber = process.env.REACT_APP_SUPPORT_NUMBER || '+1-XXX-XXX-XXXX';

  return (
    <div className="helpline">
      <h3>Need Help?</h3>
      <p>Call our AI support bot for assistance:</p>
      <a href={`tel:${supportNumber}`} className="phone-number">
        {supportNumber}
      </a>
      <p className="helpline-info">
        Available 24/7 for transaction inquiries and technical support
      </p>
    </div>
  );
}

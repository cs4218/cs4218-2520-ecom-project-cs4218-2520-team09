import React from "react";
import Layout from "./../components/Layout";

const Policy = () => {
  return (
    <Layout title={"Privacy Policy"}>
      {/* Liu, Yiwei, A0332922J */}
      <div className="row policy-container">
        <div className="col-md-6 ">
          {/* Liu, Yiwei, A0332922J */}
          <img
            src="/images/policy.jpeg"
            alt="privacy policy"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col-md-4">
          {/* Liu, Yiwei, A0332922J */}
          <h1>Privacy Policy</h1>
          <p>We value your privacy and are committed to protecting your personal data.</p>
          <p>add privacy policy</p>
          <p>add privacy policy</p>
          <p>add privacy policy</p>
          <p>add privacy policy</p>
          <p>add privacy policy</p>
        </div>
      </div>
    </Layout>
  );
};

export default Policy;
const ejs = require('ejs');
const path = require('path');
const transporter = require('../config/mail');

/**
 * Sends an email using an EJS template
 * @param {string} to - The recipient's email address
 * @param {string} subject - The subject line
 * @param {string} templateName - The filename of the template (e.g., 'welcome.ejs')
 * @param {object} data - The data object to pass to the EJS template (e.g., { name: 'John', action_url: '...' })
 */
const sendEmail = async (to, subject, templateName, data) => {
  try {
    // 1. Construct the path to your 'views' folder
    // Note: Adjust '../views' if your folder structure is different
    const templatePath = path.join(__dirname, '../views/emails', templateName);

    // 2. Render the EJS file to HTML
    const html = await ejs.renderFile(templatePath, data);

    // 3. Send the email
    await transporter.sendMail({
      from: `"Satta King Team" <${process.env.EMAIL_USER}>`, // Updated Branding
      to,
      subject,
      html // We send 'html', not 'text'
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (err) {
    console.error('Email send error:', err);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
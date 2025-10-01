import { Request, Response } from 'express';
import nodemailer from 'nodemailer';

export const submitFeedback = async (req: Request, res: Response) => {
  const { feedbackType, message } = req.body;
  const screenshot = req.file;

  if (!feedbackType || !message) {
    return res.status(400).json({ message: 'Feedback type and message are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'info@famconomy.com',
      subject: `New Feedback: ${feedbackType}`,
      text: message,
      attachments: screenshot ? [{ filename: screenshot.originalname, path: screenshot.path, contentType: screenshot.mimetype }] : [],
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

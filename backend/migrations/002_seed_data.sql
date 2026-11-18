-- Seed data for CivicEvents+

-- 1. Users
INSERT INTO users (id, full_name, email, password_hash, role, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Admin Officer', 'admin@civicevents.org', '$2b$10$7TD8gKKo9M3A3nwB8ZyDuOxi5ExQw7IhLPBoBnV9hiaq6SUExQqo6', 'admin', true),
  ('b0000000-0000-0000-0000-000000000002', 'John Doe', 'john.doe@example.com', '$2b$10$4zNdZI.52i384OUHUDuRxOkGNXpXRrykZ.Te5srCrZuMIh7XEevUG', 'user', true),
  ('c0000000-0000-0000-0000-000000000003', 'Sarah Smith', 'sarah.smith@example.com', '$2b$10$4zNdZI.52i384OUHUDuRxOkGNXpXRrykZ.Te5srCrZuMIh7XEevUG', 'user', true)
ON CONFLICT (email) DO NOTHING;

-- 2. Events
INSERT INTO events (id, title, description, location, starts_at, ends_at, published, metadata)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 
   'Annual Civic Tech Forum 2026', 
   'A premier gathering of community technologists, civic innovators, and engaged citizens exploring open government, civic data portals, and digital public services.', 
   'Convention Center, Main Hall', 
   NOW() + INTERVAL '14 days', 
   NOW() + INTERVAL '14 days 8 hours', 
   true, 
   '{"image_url": "http://localhost:4000/uploads/events/civic-tech-forum.svg"}'::jsonb),
  ('e0000000-0000-0000-0000-000000000002', 
   'Green City Initiative Summit', 
   'Collaborative working groups focusing on sustainable urban living, recycling improvements, tree canopy expansion, and renewable energy adoption across civic neighborhoods.', 
   'Eco Innovation Hub, Green Room', 
   NOW() + INTERVAL '21 days', 
   NOW() + INTERVAL '21 days 5 hours', 
   true, 
   '{"image_url": "http://localhost:4000/uploads/events/green-city-summit.svg"}'::jsonb),
  ('e0000000-0000-0000-0000-000000000003', 
   'Youth Leadership Roundtable', 
   'Empowering the next generation of public leaders with hands-on civic policy workshops, debate sessions, and mentorship from veteran community organizers.', 
   'City Library Auditorium', 
   NOW() + INTERVAL '28 days', 
   NOW() + INTERVAL '28 days 4 hours', 
   true, 
   '{"image_url": "http://localhost:4000/uploads/events/youth-leadership.svg"}'::jsonb),
  ('e0000000-0000-0000-0000-000000000004', 
   'Civic Budget Planning Workshop', 
   'Community review session analyzing municipal budget allocation, participatory budgeting outcomes, and citizen feedback on local infrastructure investments.', 
   'Town Hall, Room 204', 
   NOW() - INTERVAL '5 days', 
   NOW() - INTERVAL '5 days - 3 hours', 
   true, 
   '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Announcements
INSERT INTO announcements (id, title, audio_url, published)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 
   'Important Notice: City Council Public Hearing Schedule', 
   'http://localhost:4000/uploads/announcements/sample-announcement.wav', 
   true),
  ('a1000000-0000-0000-0000-000000000002', 
   'Community Volunteer Safety & Onboarding Briefing', 
   'http://localhost:4000/uploads/announcements/sample-announcement.wav', 
   true)
ON CONFLICT (id) DO NOTHING;

-- 4. Promos
INSERT INTO promos (id, title, description, video_url, caption_text, published, created_by)
VALUES
  ('01000000-0000-0000-0000-000000000001', 
   'Civic Engagement: Voice of the People', 
   'Learn how your involvement transforms neighborhood projects and shapes legislative policy.', 
   'http://localhost:4000/uploads/promos/sample-promo.mp4', 
   'Welcome to the Civic Engagement Initiative. Every citizen voice matters in building our shared future. Together we create stronger, more resilient communities.', 
   true, 
   'a0000000-0000-0000-0000-000000000001'),
  ('01000000-0000-0000-0000-000000000002', 
   'Clean & Green Streets Campaign', 
   'Discover the practical steps our neighborhood teams are taking to eliminate waste and green our public spaces.', 
   'http://localhost:4000/uploads/promos/sample-promo.mp4', 
   'Join thousands of neighbors next Saturday for our annual neighborhood clean-up effort. Tools and refreshments provided for all participants.', 
   true, 
   'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 5. Event Registrations
INSERT INTO event_registrations (id, user_id, event_id, status)
VALUES
  ('02000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'registered'),
  ('02000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'registered'),
  ('02000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 'registered')
ON CONFLICT (user_id, event_id) DO NOTHING;

-- 6. Event Feedback
INSERT INTO event_feedback (id, user_id, event_id, rating, comment)
VALUES
  ('03000000-0000-0000-0000-000000000001', 
   'b0000000-0000-0000-0000-000000000002', 
   'e0000000-0000-0000-0000-000000000004', 
   5, 
   'Insightful workshop! Great transparency on city funding priorities.'),
  ('03000000-0000-0000-0000-000000000002', 
   'c0000000-0000-0000-0000-000000000003', 
   'e0000000-0000-0000-0000-000000000004', 
   4, 
   'Well organized session. Looking forward to more Q&A time in future sessions.')
ON CONFLICT (user_id, event_id) DO NOTHING;

-- 7. Notifications
INSERT INTO notifications (id, title, message, type, recipient_id, metadata, read, created_by)
VALUES
  ('04000000-0000-0000-0000-000000000001', 
   'Welcome to CivicEvents+', 
   'Thank you for joining our community civic engagement platform. Check out upcoming events and participate in local initiatives!', 
   'system', 
   NULL, 
   '{}'::jsonb, 
   false, 
   'a0000000-0000-0000-0000-000000000001'),
  ('04000000-0000-0000-0000-000000000002', 
   'Annual Civic Tech Forum Announced', 
   'Registration is now open for the Annual Civic Tech Forum 2026. Reserve your spot today!', 
   'event', 
   NULL, 
   '{"event_id": "e0000000-0000-0000-0000-000000000001"}'::jsonb, 
   false, 
   'a0000000-0000-0000-0000-000000000001'),
  ('04000000-0000-0000-0000-000000000003', 
   'Registration Confirmed', 
   'You have been successfully registered for the Annual Civic Tech Forum 2026.', 
   'event', 
   'b0000000-0000-0000-0000-000000000002', 
   '{"event_id": "e0000000-0000-0000-0000-000000000001"}'::jsonb, 
   false, 
   'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

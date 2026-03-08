-- Add model column to hook_generated_images
ALTER TABLE hook_generated_images
  ADD COLUMN model TEXT DEFAULT 'google/nano-banana-pro';

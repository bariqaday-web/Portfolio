-- Public profile/product images are restricted to small, non-active image types.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'covers';

notify pgrst, 'reload schema';

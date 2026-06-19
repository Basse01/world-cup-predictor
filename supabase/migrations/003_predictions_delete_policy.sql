create policy "predictions_delete_own" on public.predictions
  for delete using (auth.uid() = user_id);

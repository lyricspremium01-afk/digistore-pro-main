
REVOKE EXECUTE ON FUNCTION public.admin_confirm_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_order(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_product_status(uuid, public.product_status, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user(uuid, int, public.account_status) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_seller_level(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_confirm_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_product_status(uuid, public.product_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user(uuid, int, public.account_status) TO authenticated;

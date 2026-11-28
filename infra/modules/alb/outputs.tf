output "alb_dns_name" {
  description = "DNS name for the ALB"
  value       = aws_lb.alb.dns_name
}

output "target_group_arn" {
  description = "ARN for the Target Group"
  value       = aws_lb_target_group.tg.arn
}
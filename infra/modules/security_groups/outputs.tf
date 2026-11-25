output "alb_security_group_id" {
    description = "ID of ALB Secutity Group"
    value = aws_security_group.alb.id
}


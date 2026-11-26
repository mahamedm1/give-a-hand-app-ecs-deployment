resource "aws_lb" "alb" {
  name               = var.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.subnet_ids

  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.id
    prefix  = "aws-alb"
    enabled = true
  }

  tags = {
    Name = var.alb_name
  }
}

resource "aws_lb_target_group" "ip" {
  name        = "target_group_name"
  port        = 80
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id
}

resource "aws_vpc" "main" {
  cidr_block = vpc_cidr_block
}

resource "aws_security_group" "alb" {
  name        = var.alb_sg_name
  description = "Security group for our ALB"
  vpc_id      = var.vpc_id

  tags = {
    Name = var.alb_sg_name
  }
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = var.https_cidr
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}


resource "aws_vpc_security_group_egress_rule" "alb" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = var.egress_cidr
  ip_protocol       = "-1" # semantically equivalent to all ports
  ports             = "80"
}

resource "aws_security_group" "ecs" {
  name        = var.ecs_sg_namesg_name
  description = "Security group for our ALB"
  vpc_id      = var.vpc_id

  tags = {
    Name = var.ecs_sg_name
  }
}

resource "aws_vpc_security_group_ingress_rule" "ecs" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 80
  ip_protocol                  = "tcp"
  to_port                      = 80
}

resource "aws_vpc_security_group_egress_rule" "ecs" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = var.egress_cidr
  ip_protocol       = "-1" # semantically equivalent to all ports
}